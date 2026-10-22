"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import {
  errorState,
  prismaErrorMessage,
  successState,
  type ActionState,
  type PasswordRevealState,
} from "@/lib/action-result";
import { logActivity } from "@/lib/activity";
import { encryptPassword } from "@/lib/password-vault";
import {
  canRevealPassword,
  REVEAL_DENIED_MESSAGE,
  revealPassword,
} from "@/lib/password-reveal";
import { actionPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  ASSIGN_ADMIN_MESSAGE,
  canAssignLevel,
  canManageLevel,
  MANAGE_ADMIN_MESSAGE,
} from "@/lib/user-management";
import {
  createUserSchema,
  fieldErrors,
  resetPasswordSchema,
  updateUserSchema,
  userRoleChangeSchema,
  userToggleSchema,
} from "@/lib/validators";

/** bcrypt cost, matching the hash-password script so hashes stay comparable. */
const BCRYPT_COST = 10;

function revalidateUsers() {
  revalidatePath("/users");
}

/** Every mutation on this screen needs the Users permission; the page is gated
 *  too, but an action can be called directly, so the check lives here as well. */
function requireUsers() {
  return actionPermission("USERS");
}

/** Active people whose role is at the full-admin level. The library must always
 *  keep at least one, or nobody could manage accounts again. */
async function countActiveAdmins(): Promise<number> {
  return prisma.user.count({ where: { active: true, role: { level: "ADMIN" } } });
}

export async function createUserAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const gate = await requireUsers();
  if ("denied" in gate) return gate.denied;
  const session = gate.session;

  const parsed = createUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    roleId: formData.get("roleId"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return errorState("Please check the highlighted fields.", fieldErrors(parsed.error));
  }

  const { name, email, roleId, password } = parsed.data;

  try {
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      select: { name: true, level: true },
    });
    if (!role) {
      return errorState("Please check the highlighted fields.", {
        roleId: "Choose a role",
      });
    }

    // Handing out full access is a full-admin job, or the Users permission
    // would be the same as full access with one extra field.
    if (!canAssignLevel(session.level, role.level)) {
      return errorState(ASSIGN_ADMIN_MESSAGE);
    }

    const taken = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (taken) {
      return errorState("Please check the highlighted fields.", {
        email: "An account with that email already exists",
      });
    }

    await prisma.user.create({
      data: {
        email,
        name: name ?? null,
        roleId,
        passwordHash: bcrypt.hashSync(password, BCRYPT_COST),
        // A second, encrypted copy so the owner can read the password back.
        passwordCiphertext: encryptPassword(password),
      },
    });

    await logActivity(
      "PASSWORD_CHANGED",
      { id: null, email },
      `set by ${session.email}`,
    );

    revalidateUsers();
    return successState(`${email} can now sign in as ${role.name}.`);
  } catch (error) {
    return errorState(prismaErrorMessage(error));
  }
}

/**
 * Edits every field on an account in one save: name, sign-in email, role,
 * optional new password, and whether the account can sign in. The same
 * last-admin and self-lockout guards as the smaller actions apply here, so the
 * combined form cannot be used to bypass them.
 */
export async function updateUserAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const gate = await requireUsers();
  if ("denied" in gate) return gate.denied;
  const session = gate.session;

  const parsed = updateUserSchema.safeParse({
    userId: formData.get("userId"),
    name: formData.get("name"),
    email: formData.get("email"),
    roleId: formData.get("roleId"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return errorState("Please check the highlighted fields.", fieldErrors(parsed.error));
  }

  const { userId, name, email, roleId, password } = parsed.data;
  // The self checkbox is disabled in the editor, so a disabled input would
  // otherwise look like "off" and this action would reject the whole save.
  // Editing yourself always keeps your own account active.
  const active = userId === session.userId ? true : formData.get("active") === "on";

  try {
    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        active: true,
        role: { select: { name: true, level: true } },
      },
    });
    if (!target) return errorState("That account no longer exists.");

    const role = await prisma.role.findUnique({
      where: { id: roleId },
      select: { name: true, level: true },
    });
    if (!role) {
      return errorState("Please check the highlighted fields.", {
        roleId: "That role no longer exists",
      });
    }

    // An admin account, and the full-admin level itself, are both a full
    // admin's business. Otherwise a day-to-day manager could edit the owner
    // out of the way, or promote themselves. This comes before the email
    // check so the refusal is the answer, not a side note.
    if (!canManageLevel(session.level, target.role.level)) {
      return errorState(MANAGE_ADMIN_MESSAGE);
    }
    if (!canAssignLevel(session.level, role.level)) {
      return errorState(ASSIGN_ADMIN_MESSAGE);
    }

    const taken = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (taken && taken.id !== target.id) {
      return errorState("Please check the highlighted fields.", {
        email: "An account with that email already exists",
      });
    }

    if (target.active && !active && session.userId === target.id) {
      return errorState("You cannot deactivate your own account.");
    }

    const losesAdmin =
      target.active && target.role.level === "ADMIN" && (role.level !== "ADMIN" || !active);
    if (losesAdmin && (await countActiveAdmins()) <= 1) {
      return errorState("At least one active admin must remain. Give someone else full admin first.");
    }

    await prisma.user.update({
      where: { id: target.id },
      data: {
        name: name ?? null,
        email,
        roleId,
        active,
        ...(password
          ? {
              passwordHash: bcrypt.hashSync(password, BCRYPT_COST),
              passwordCiphertext: encryptPassword(password),
            }
          : {}),
      },
    });

    if (password) {
      await logActivity(
        "PASSWORD_CHANGED",
        { id: target.id, email },
        `by ${session.email}`,
      );
    }
    if (target.role.name !== role.name) {
      await logActivity(
        "ROLE_CHANGED",
        { id: target.id, email },
        `${target.role.name} → ${role.name}`,
      );
    }
    if (target.active !== active) {
      await logActivity(
        active ? "REACTIVATED" : "DEACTIVATED",
        { id: target.id, email },
        `by ${session.email}`,
      );
    }

    revalidateUsers();
    return successState(`Saved changes for ${email}.`);
  } catch (error) {
    return errorState(prismaErrorMessage(error));
  }
}

export async function updateUserRoleAction(formData: FormData): Promise<ActionState> {
  const gate = await requireUsers();
  if ("denied" in gate) return gate.denied;
  const session = gate.session;

  const parsed = userRoleChangeSchema.safeParse({
    userId: formData.get("userId"),
    roleId: formData.get("roleId"),
  });
  if (!parsed.success) {
    return errorState("Please check the highlighted fields.", fieldErrors(parsed.error));
  }

  try {
    const target = await prisma.user.findUnique({
      where: { id: parsed.data.userId },
      select: { id: true, email: true, active: true, role: { select: { name: true, level: true } } },
    });
    if (!target) return errorState("That account no longer exists.");

    const role = await prisma.role.findUnique({
      where: { id: parsed.data.roleId },
      select: { name: true, level: true },
    });
    if (!role) return errorState("That role no longer exists.");

    // Moving somebody on, and moving them up to full access, are both
    // full-admin jobs.
    if (!canManageLevel(session.level, target.role.level)) {
      return errorState(MANAGE_ADMIN_MESSAGE);
    }
    if (!canAssignLevel(session.level, role.level)) {
      return errorState(ASSIGN_ADMIN_MESSAGE);
    }

    if (target.role.level === "ADMIN" && role.level !== "ADMIN" && target.active) {
      if ((await countActiveAdmins()) <= 1) {
        return errorState("At least one active admin must remain. Give someone else full admin first.");
      }
    }

    await prisma.user.update({
      where: { id: target.id },
      data: { roleId: parsed.data.roleId },
    });

    await logActivity(
      "ROLE_CHANGED",
      { id: target.id, email: target.email },
      `${target.role.name} → ${role.name}`,
    );

    revalidateUsers();
    return successState(`${target.email} is now ${role.name}.`);
  } catch (error) {
    return errorState(prismaErrorMessage(error));
  }
}

export async function resetUserPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const gate = await requireUsers();
  if ("denied" in gate) return gate.denied;
  const session = gate.session;

  const parsed = resetPasswordSchema.safeParse({
    userId: formData.get("userId"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return errorState("Please check the highlighted fields.", fieldErrors(parsed.error));
  }

  try {
    const target = await prisma.user.findUnique({
      where: { id: parsed.data.userId },
      select: { id: true, email: true, role: { select: { level: true } } },
    });
    if (!target) return errorState("That account no longer exists.");

    // Setting somebody's password is how you take their account over, so an
    // admin account is a full admin's business.
    if (!canManageLevel(session.level, target.role.level)) {
      return errorState(MANAGE_ADMIN_MESSAGE);
    }

    await prisma.user.update({
      where: { id: target.id },
      data: {
        passwordHash: bcrypt.hashSync(parsed.data.password, BCRYPT_COST),
        // Keep the readable copy in step with the hash.
        passwordCiphertext: encryptPassword(parsed.data.password),
      },
    });

    await logActivity(
      "PASSWORD_CHANGED",
      { id: target.id, email: target.email },
      `by ${session.email}`,
    );

    revalidateUsers();
    return successState(`Password updated for ${target.email}.`);
  } catch (error) {
    return errorState(prismaErrorMessage(error));
  }
}

/**
 * Reads back the last password the owner set for an account, so they do not
 * have to reset somebody's password because they forgot what they handed out.
 *
 * Reading a password is more than managing one, so it needs full access: a
 * role that merely holds the Users permission can set a new password but
 * cannot read the old one back. Every read is written to the activity log,
 * because showing somebody's password is exactly the kind of thing the owner
 * wants to see later. The plain password only travels to the browser that
 * asked for it; it is never written to the log.
 */
export async function revealUserPasswordAction(userId: number): Promise<PasswordRevealState> {
  const gate = await requireUsers();
  if ("denied" in gate) {
    return { status: "error", message: gate.denied.message ?? "You cannot do that." };
  }
  const session = gate.session;

  if (!canRevealPassword(session.level)) {
    return { status: "error", message: REVEAL_DENIED_MESSAGE };
  }

  try {
    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, passwordCiphertext: true },
    });
    if (!target) return { status: "error", message: "That account no longer exists." };

    const revealed = revealPassword(target.passwordCiphertext);
    if (revealed.status === "error") return revealed;

    await logActivity(
      "PASSWORD_VIEWED",
      { id: target.id, email: target.email },
      `by ${session.email}`,
    );

    return revealed;
  } catch {
    return { status: "error", message: "Something went wrong while reading the password." };
  }
}

/**
 * Activates or deactivates an account. The last active admin can be neither
 * deactivated nor demoted, and nobody can deactivate themselves, so there is
 * no way to lock the library out of its own app.
 */
export async function toggleUserActiveAction(formData: FormData): Promise<ActionState> {
  const gate = await requireUsers();
  if ("denied" in gate) return gate.denied;
  const session = gate.session;

  const parsed = userToggleSchema.safeParse({ userId: formData.get("userId") });
  if (!parsed.success) {
    return errorState("Please check the highlighted fields.", fieldErrors(parsed.error));
  }

  try {
    const target = await prisma.user.findUnique({
      where: { id: parsed.data.userId },
      select: { id: true, email: true, active: true, role: { select: { level: true } } },
    });
    if (!target) return errorState("That account no longer exists.");

    // Switching off somebody's account is a full-admin job when the account
    // is an admin's.
    if (!canManageLevel(session.level, target.role.level)) {
      return errorState(MANAGE_ADMIN_MESSAGE);
    }

    if (target.active && session.userId === target.id) {
      return errorState("You cannot deactivate your own account.");
    }

    if (target.active && target.role.level === "ADMIN") {
      if ((await countActiveAdmins()) <= 1) {
        return errorState("At least one active admin must remain.");
      }
    }

    await prisma.user.update({
      where: { id: target.id },
      data: { active: !target.active },
    });

    await logActivity(
      target.active ? "DEACTIVATED" : "REACTIVATED",
      { id: target.id, email: target.email },
      `by ${session.email}`,
    );

    revalidateUsers();
    return successState(
      target.active
        ? `${target.email} can no longer sign in.`
        : `${target.email} can sign in again.`,
    );
  } catch (error) {
    return errorState(prismaErrorMessage(error));
  }
}
