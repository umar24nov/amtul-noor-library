"use server";

import { redirect } from "next/navigation";
import { errorState, successState, type ActionState } from "@/lib/action-result";
import {
  applicationEmailIsConfigured,
  sendMemberLinkCodeEmail,
} from "@/lib/application-email";
import { maskEmail } from "@/lib/email-mask";
import { getClientIp } from "@/lib/login-rate-limit";
import { memberPortalCredentialsMatch } from "@/lib/member-portal-access";
import { createMemberLinkAccess } from "@/lib/member-link-auth";
import {
  checkMemberLinkOtpLimit,
  createMemberLinkOtpRequest,
  discardMemberLinkOtpRequest,
  verifyMemberLinkCode,
} from "@/lib/member-link-otp";
import { OTP_TTL_MINUTES } from "@/lib/otp-code";
import { prisma } from "@/lib/prisma";
import {
  fieldErrors,
  memberPortalAccessSchema,
  memberPortalVerifySchema,
} from "@/lib/validators";

const CODE_SENT = (email: string) =>
  `If those details match our records, we sent a 6 digit code to ${maskEmail(email)}. It expires in ${OTP_TTL_MINUTES} minutes.`;

const CODE_WRONG =
  "That code is not correct or has expired. Check your details, request a new code and try again.";

/**
 * Public entry to the member area. The address is never trusted as a delivery
 * target: it is only used to find the email already saved on the member record.
 * The reply is generic whether or not the details match, so the form cannot be
 * used to discover who is a member.
 */
export async function requestMemberPortalCodeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = memberPortalAccessSchema.safeParse({
    memberId: formData.get("memberId"),
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return errorState("Please check the highlighted fields.", fieldErrors(parsed.error));
  }

  const memberId = parsed.data.memberId.toUpperCase();
  const email = parsed.data.email.toLowerCase();
  const ip = await getClientIp();

  const member = await prisma.member.findUnique({
    where: { memberId },
    select: { id: true, payToken: true, email: true, status: true },
  });
  const savedEmail = member?.email ?? null;
  const savedPayToken = member?.payToken ?? null;
  // A member only gets a code while the library still lists them as ACTIVE.
  const matched = memberPortalCredentialsMatch({
    status: member?.status,
    savedEmail,
    enteredEmail: email,
    savedPayToken,
  });

  // The synthetic key throttles attempts that do not match anyone. A matched
  // request also goes through the real link limiter, so it shares the same
  // ceiling as codes requested from the member's own pay link.
  const limits = await Promise.all([
    checkMemberLinkOtpLimit(`portal:${memberId}:${email}`, ip),
    ...(matched && savedPayToken ? [checkMemberLinkOtpLimit(savedPayToken, ip)] : []),
  ]);
  const limit = limits.find((result) => result.limited);
  if (limit) {
    return errorState(
      `Too many codes requested. Try again in ${limit.retryAfterMinutes} minute${
        limit.retryAfterMinutes === 1 ? "" : "s"
      }.`,
    );
  }

  if (!applicationEmailIsConfigured()) {
    return errorState("Email is not set up yet. Please contact the library.");
  }

  if (!matched || !savedPayToken || !savedEmail) return successState(CODE_SENT(email));

  const request = await createMemberLinkOtpRequest(savedPayToken, savedEmail, ip, "ACCESS");
  const sent = await sendMemberLinkCodeEmail({ to: savedEmail, code: request.code });
  if (!sent.ok) {
    await discardMemberLinkOtpRequest(request.id);
    return errorState("Could not send the code. Please try again or contact the library.");
  }

  return successState(CODE_SENT(email));
}

/**
 * Verifies the code against the same record found in step one, then issues the
 * member cookie and lands on details — the only section members may edit.
 */
export async function verifyMemberPortalCodeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = memberPortalVerifySchema.safeParse({
    memberId: formData.get("memberId"),
    email: formData.get("email"),
    code: formData.get("code"),
  });
  if (!parsed.success) {
    return errorState("Please check the highlighted fields.", fieldErrors(parsed.error));
  }

  const memberId = parsed.data.memberId.toUpperCase();
  const email = parsed.data.email.toLowerCase();
  const member = await prisma.member.findUnique({
    where: { memberId },
    select: { id: true, payToken: true, email: true, status: true },
  });
  const matched = memberPortalCredentialsMatch({
    status: member?.status,
    savedEmail: member?.email ?? null,
    enteredEmail: email,
    savedPayToken: member?.payToken ?? null,
  });
  if (!member || !member.email || !member.payToken || !matched) {
    return errorState(CODE_WRONG);
  }

  const savedEmail = member.email;
  const savedPayToken = member.payToken;

  const result = await verifyMemberLinkCode(savedPayToken, savedEmail, parsed.data.code, "ACCESS");
  if (!result.ok) return errorState(result.message);

  await prisma.memberLinkOtp.delete({ where: { id: result.id } }).catch(() => {});
  await createMemberLinkAccess({ memberId: member.id, payToken: savedPayToken });

  redirect(`/pay/${savedPayToken}/details`);
}
