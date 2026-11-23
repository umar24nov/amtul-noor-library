"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { errorState, successState, type ActionState } from "@/lib/action-result";
import { logActivity } from "@/lib/activity";
import { applicationEmailIsConfigured, sendLoginCodeEmail } from "@/lib/application-email";
import { createSession } from "@/lib/auth";
import { clearLoginFailures, getClientIp } from "@/lib/login-rate-limit";
import { OTP_TTL_MINUTES } from "@/lib/otp-code";
import {
  checkOtpRequestLimit,
  createOtpRequest,
  discardOtpRequest,
  verifyOtpCode,
} from "@/lib/otp-store";
import { prisma } from "@/lib/prisma";
import { fieldErrors, otpRequestSchema, otpVerifySchema } from "@/lib/validators";

/** Matches the cost used by the Users and Profile password actions. */
const BCRYPT_COST = 10;

function safeNext(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }
  return value;
}

/** Deliberately says the same thing whether or not the address has an account. */
function sentMessage(): string {
  return `If an account exists for that email, a sign-in code is on its way. It expires in ${OTP_TTL_MINUTES} minutes.`;
}

/**
 * Step one: email a single-use code. The code is generated and hashed in the
 * database first; if the email cannot be delivered, the row is removed so a
 * code nobody received cannot be used later.
 */
export async function requestOtpAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = otpRequestSchema.safeParse({
    email: formData.get("email"),
    next: formData.get("next"),
  });
  if (!parsed.success) {
    return errorState("Please check the highlighted fields.", fieldErrors(parsed.error));
  }

  const { email } = parsed.data;
  const ip = await getClientIp();
  const limit = await checkOtpRequestLimit(email, ip);
  if (limit.limited) {
    return errorState(
      `Too many codes requested. Try again in ${limit.retryAfterMinutes} minute${
        limit.retryAfterMinutes === 1 ? "" : "s"
      }.`,
    );
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, active: true },
  });
  if (!user || !user.active) return successState(sentMessage());

  if (!applicationEmailIsConfigured()) {
    return errorState("Email is not set up yet. Please ask the library owner to reset your password.");
  }

  const request = await createOtpRequest(email, ip);
  const sent = await sendLoginCodeEmail({ to: email, code: request.code });
  if (!sent.ok) {
    await discardOtpRequest(request.id);
    return errorState("Could not send the code. Please try again.");
  }

  return successState(sentMessage());
}

/**
 * Step two: check the code, set the new password it stands in for, and sign in.
 * Claiming the code is atomic, so the same code cannot be spent twice.
 */
export async function verifyOtpAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = otpVerifySchema.safeParse({
    email: formData.get("email"),
    code: formData.get("code"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
    next: formData.get("next"),
  });
  if (!parsed.success) {
    return errorState("Please check the highlighted fields.", fieldErrors(parsed.error));
  }

  const { email, code, next } = parsed.data;
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      roleId: true,
      active: true,
      role: { select: { level: true } },
    },
  });
  if (!user || !user.active) {
    return errorState("That code is invalid or has expired. Request a new one.");
  }

  const result = await verifyOtpCode(email, code);
  if (!result.ok) return errorState(result.message);

  const passwordHash = bcrypt.hashSync(parsed.data.newPassword, BCRYPT_COST);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, passwordCiphertext: null, lastLoginAt: new Date() },
    }),
    // The code has done its job; keeping the row would only let it be replayed
    // if a future bug skipped the consumedAt check.
    prisma.loginOtp.delete({ where: { id: result.id } }),
  ]);

  await clearLoginFailures(email);
  await logActivity("PASSWORD_CHANGED", { id: user.id, email: user.email }, "via email code");
  await logActivity("LOGIN", { id: user.id, email: user.email }, "via email code");

  await createSession({
    email: user.email,
    userId: user.id,
    roleId: user.roleId,
    level: user.role.level,
  });

  redirect(safeNext(next));
}
