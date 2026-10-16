"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { errorState, prismaErrorMessage, successState, type ActionState } from "@/lib/action-result";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createUserSchema,
  fieldErrors,
  resetPasswordSchema,
  userRoleChangeSchema,
  userToggleSchema,
} from "@/lib/validators";

/** bcrypt cost, matching the hash-password script so hashes stay comparable. */
const BCRYPT_COST = 10;

function revalidateUsers() {
  revalidatePath("/users");
}

/** Every mutation on this screen is admin only; the page itself is too, but an
 *  action can be called directly, so the check lives here as well. */
async function adminOnly(): Promise<ActionState | null> {
  const session = await getAdminSession();
  return session ? null : errorState("Only an admin can manage accounts.");
}

export async function createUserAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const denied = await adminOnly();
  if (denied) return denied;

  const parsed = createUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return errorState("Please check the highlighted fields.", fieldErrors(parsed.error));
  }

  const { name, email, role, password } = parsed.data;

  try {
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
        role,
        passwordHash: bcrypt.hashSync(password, BCRYPT_COST),
      },
    });

    revalidateUsers();
    return successState(`${email} can now sign in as ${role === "ADMIN" ? "an admin" : "staff"}.`);
  } catch (error) {
    return errorState(prismaErrorMessage(error));
  }
}

export async function updateUserRoleAction(formData: FormData): Promise<ActionState> {
  const denied = await adminOnly();
  if (denied) return denied;

  const parsed = userRoleChangeSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return errorState("Please check the highlighted fields.", fieldErrors(parsed.error));
  }

  try {
    const target = await prisma.user.findUnique({
      where: { id: parsed.data.userId },
      select: { id: true, email: true, role: true, active: true },
    });
    if (!target) return errorState("That account no longer exists.");

    if (target.role === "ADMIN" && parsed.data.role === "STAFF") {
      const activeAdmins = await prisma.user.count({
        where: { role: "ADMIN", active: true },
      });
      if (activeAdmins <= 1) {
        return errorState("At least one active admin must remain. Promote someone else first.");
      }
    }

    await prisma.user.update({
      where: { id: target.id },
      data: { role: parsed.data.role },
    });

    revalidateUsers();
    return successState(
      `${target.email} is now ${parsed.data.role === "ADMIN" ? "an admin" : "staff"}.`,
    );
  } catch (error) {
    return errorState(prismaErrorMessage(error));
  }
}

export async function resetUserPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const denied = await adminOnly();
  if (denied) return denied;

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
  const denied = await adminOnly();
  if (denied) return denied;

  const session = await getAdminSession();
  const parsed = userToggleSchema.safeParse({ userId: formData.get("userId") });
  if (!parsed.success) {
    return errorState("Please check the highlighted fields.", fieldErrors(parsed.error));
  }

  try {
    const target = await prisma.user.findUnique({
      where: { id: parsed.data.userId },
      select: { id: true, email: true, role: true, active: true },
    });
    if (!target) return errorState("That account no longer exists.");

    if (target.active && session?.userId === target.id) {
      return errorState("You cannot deactivate your own account.");
    }

    if (target.active && target.role === "ADMIN") {
      const activeAdmins = await prisma.user.count({
        where: { role: "ADMIN", active: true },
      });
      if (activeAdmins <= 1) {
        return errorState("At least one active admin must remain.");
      }
    }

    await prisma.user.update({
      where: { id: target.id },
      data: { active: !target.active },
    });

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
