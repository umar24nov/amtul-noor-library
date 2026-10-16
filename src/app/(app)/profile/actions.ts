"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import {
  errorState,
  prismaErrorMessage,
  successState,
  type ActionState,
} from "@/lib/action-result";
import { createSession, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { changePasswordSchema, fieldErrors, updateProfileSchema } from "@/lib/validators";

/** bcrypt cost, matching the hash-password script so hashes stay comparable. */
const BCRYPT_COST = 10;

const SESSION_EXPIRED = "Your session has expired. Please sign in again.";

/**
 * Saves your own name and sign-in email. The cookie is re-issued with the new
 * address so the sidebar and every later request see it straight away, rather
 * than showing the old email until the next sign-in.
 */
export async function updateProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return errorState(SESSION_EXPIRED);

  const parsed = updateProfileSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return errorState("Please check the highlighted fields.", fieldErrors(parsed.error));
  }

  const { name, email } = parsed.data;

  try {
    if (email !== user.email) {
      const taken = await prisma.user.findUnique({ where: { email }, select: { id: true } });
      if (taken && taken.id !== user.id) {
        return errorState("Please check the highlighted fields.", {
          email: "An account with that email already exists",
        });
      }
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { name: name ?? null, email },
      select: { id: true, email: true, roleId: true, role: { select: { level: true } } },
    });

    await createSession({
      email: updated.email,
      userId: updated.id,
      roleId: updated.roleId,
      level: updated.role.level,
    });

    revalidatePath("/profile");
    return successState("Your details were saved.");
  } catch (error) {
    return errorState(prismaErrorMessage(error));
  }
}

/** Changes your own password, after checking the current one. */
export async function changePasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return errorState(SESSION_EXPIRED);

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return errorState("Please check the highlighted fields.", fieldErrors(parsed.error));
  }

  try {
    const row = await prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    });
    if (!row || !(await bcrypt.compare(parsed.data.currentPassword, row.passwordHash))) {
      return errorState("Please check the highlighted fields.", {
        currentPassword: "That password is not correct",
      });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: bcrypt.hashSync(parsed.data.newPassword, BCRYPT_COST) },
    });

    return successState("Your password was changed.");
  } catch (error) {
    return errorState(prismaErrorMessage(error));
  }
}
