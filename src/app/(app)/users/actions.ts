"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { errorState, prismaErrorMessage, successState, type ActionState } from "@/lib/action-result";
import { logActivity } from "@/lib/activity";
import { actionPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
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
    const role = await prisma.role.findUnique({ where: { id: roleId }, select: { name: true } });
    if (!role) {
      return errorState("Please check the highlighted fields.", {
        roleId: "Choose a role",
      });
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
      },
    });

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
        ...(password ? { passwordHash: bcrypt.hashSync(password, BCRYPT_COST) } : {}),
      },
    });

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
      select: { id: true, email: true },
    });
    if (!target) return errorState("That account no longer exists.");

    await prisma.user.update({
      where: { id: target.id },
      data: { passwordHash: bcrypt.hashSync(parsed.data.password, BCRYPT_COST) },
    });

    revalidateUsers();
    return successState(`Password updated for ${target.email}.`);
  } catch (error) {
    return errorState(prismaErrorMessage(error));
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
