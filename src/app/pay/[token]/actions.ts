"use server";

import { redirect } from "next/navigation";
import { errorState, successState, type ActionState } from "@/lib/action-result";
import { applicationEmailIsConfigured, sendMemberLinkCodeEmail } from "@/lib/application-email";
import { maskEmail } from "@/lib/email-mask";
import { getClientIp } from "@/lib/login-rate-limit";
import { createMemberLinkAccess } from "@/lib/member-link-auth";
import {
  checkMemberLinkOtpLimit,
  createMemberLinkOtpRequest,
  discardMemberLinkOtpRequest,
  verifyMemberLinkCode,
} from "@/lib/member-link-otp";
import { OTP_TTL_MINUTES } from "@/lib/otp-code";
import { prisma } from "@/lib/prisma";
import { fieldErrors, memberLinkTokenSchema, memberLinkVerifySchema } from "@/lib/validators";

/**
 * Sends a code to the email saved on the member record. The token is validated
 * against the database rather than trusted from the hidden form field, so a
 * visitor cannot redirect the code to an address of their choosing.
 */
export async function requestMemberLinkCodeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = memberLinkTokenSchema.safeParse({ payToken: formData.get("payToken") });
  if (!parsed.success) {
    return errorState("This payment link is not valid.", fieldErrors(parsed.error));
  }

  const { payToken } = parsed.data;
  const member = await prisma.member.findUnique({
    where: { payToken },
    select: { email: true },
  });
  if (!member) return errorState("This payment link is not valid.");
  if (!member.email) {
    return errorState("We do not have an email for this member yet. Please contact the library.");
  }

  const ip = await getClientIp();
  const limit = await checkMemberLinkOtpLimit(payToken, ip);
  if (limit.limited) {
    return errorState(
      `Too many codes requested. Try again in ${limit.retryAfterMinutes} minute${
        limit.retryAfterMinutes === 1 ? "" : "s"
      }.`,
    );
  }

  if (!applicationEmailIsConfigured()) {
    return errorState("Email is not set up yet. Please contact the library.");
  }

  const request = await createMemberLinkOtpRequest(payToken, member.email, ip);
  const sent = await sendMemberLinkCodeEmail({ to: member.email, code: request.code });
  if (!sent.ok) {
    await discardMemberLinkOtpRequest(request.id);
    return errorState("Could not send the code. Please try again.");
  }

  return successState(
    `We emailed a code to ${maskEmail(member.email)}. It expires in ${OTP_TTL_MINUTES} minutes.`,
  );
}

/** Checks the code, then issues a short-lived cookie scoped to this member. */
export async function verifyMemberLinkCodeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = memberLinkVerifySchema.safeParse({
    payToken: formData.get("payToken"),
    code: formData.get("code"),
  });
  if (!parsed.success) {
    return errorState("Please check the highlighted fields.", fieldErrors(parsed.error));
  }

  const { payToken, code } = parsed.data;
  const member = await prisma.member.findUnique({
    where: { payToken },
    select: { id: true, email: true },
  });
  if (!member || !member.email) {
    return errorState("This payment link cannot be verified. Please contact the library.");
  }

  const result = await verifyMemberLinkCode(payToken, member.email, code);
  if (!result.ok) return errorState(result.message);

  // The row is already claimed; removing it keeps a spent code from being tried
  // again if the consumedAt check is ever changed by mistake.
  await prisma.memberLinkOtp.delete({ where: { id: result.id } }).catch(() => {});

  await createMemberLinkAccess({ memberId: member.id, payToken });
  redirect(`/pay/${payToken}`);
}
