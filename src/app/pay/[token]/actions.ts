"use server";

import { redirect } from "next/navigation";
import { errorState, successState, type ActionState } from "@/lib/action-result";
import {
  applicationEmailIsConfigured,
  sendMemberEmailChangeCodeEmail,
  sendMemberLinkCodeEmail,
} from "@/lib/application-email";
import { maskEmail } from "@/lib/email-mask";
import { getClientIp } from "@/lib/login-rate-limit";
import { logMemberChange, MEMBER_AUDIT_ACTIONS } from "@/lib/member-audit";
import { createMemberLinkAccess } from "@/lib/member-link-auth";
import {
  checkMemberLinkOtpLimit,
  createMemberLinkOtpRequest,
  discardMemberLinkOtpRequest,
  verifyMemberLinkCode,
} from "@/lib/member-link-otp";
import { OTP_TTL_MINUTES } from "@/lib/otp-code";
import { prisma } from "@/lib/prisma";
import { requirePortalMemberAccess, revalidatePortal } from "./portal-data";
import {
  fieldErrors,
  memberEmailChangeRequestSchema,
  memberEmailChangeVerifySchema,
  memberLinkTokenSchema,
  memberLinkVerifySchema,
  memberSelfEditSchema,
} from "@/lib/validators";

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

/** Lets a member correct their own personal details. */
export async function updateMemberDetailsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = memberSelfEditSchema.safeParse({
    payToken: formData.get("payToken"),
    name: formData.get("name"),
    mobile: formData.get("mobile"),
    guardianName: formData.get("guardianName"),
    guardianMobile: formData.get("guardianMobile"),
  });
  if (!parsed.success) {
    return errorState("Please check the highlighted fields.", fieldErrors(parsed.error));
  }

  const { payToken, ...details } = parsed.data;
  const member = await requirePortalMemberAccess(payToken);
  if (!member) return errorState("Please verify this link before editing your details.");

  const mobile = details.mobile ?? null;
  const guardianName = details.guardianName ?? null;
  const guardianMobile = details.guardianMobile ?? null;

  await prisma.$transaction(async (tx) => {
    await tx.member.update({
      where: { id: member.id },
      data: {
        name: details.name,
        mobile,
        guardianName,
        guardianMobile,
      },
    });

    // Keep the originating application in step, like the admin edit does.
    // Application.mobile is required, so it is only overwritten when the member
    // supplies a number; clearing it on the member record leaves the original
    // application number intact.
    await tx.application.updateMany({
      where: { memberId: member.id },
      data: {
        name: details.name,
        ...(mobile ? { mobile } : {}),
        guardianName,
        guardianMobile,
      },
    });

    await logMemberChange(tx, {
      memberId: member.id,
      action: MEMBER_AUDIT_ACTIONS.MEMBER_SELF_UPDATED,
      actorName: "Member",
      summary: "Member updated their personal details",
      changes: [
        { field: "name", label: "Name", old: member.name, new: details.name },
        { field: "mobile", label: "Mobile", old: member.mobile, new: mobile },
        { field: "guardianName", label: "Guardian name", old: member.guardianName, new: guardianName },
        { field: "guardianMobile", label: "Guardian mobile", old: member.guardianMobile, new: guardianMobile },
      ],
    });
  });

  revalidatePortal(payToken);
  redirect(`/pay/${payToken}/details`);
}

/** Sends a confirmation code to the new email a member wants to use. */
export async function requestMemberEmailChangeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = memberEmailChangeRequestSchema.safeParse({
    payToken: formData.get("payToken"),
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return errorState("Please check the highlighted fields.", fieldErrors(parsed.error));
  }

  const { payToken, email } = parsed.data;
  const member = await requirePortalMemberAccess(payToken);
  if (!member) return errorState("Please verify this link before changing your email.");
  if (member.email && member.email.toLowerCase() === email) {
    return errorState("That is already the email on your record.", { email: "Already your email" });
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

  const request = await createMemberLinkOtpRequest(payToken, email, ip, "EMAIL_CHANGE");
  const sent = await sendMemberEmailChangeCodeEmail({ to: email, code: request.code });
  if (!sent.ok) {
    await discardMemberLinkOtpRequest(request.id);
    return errorState("Could not send the code. Please try again.");
  }

  return successState(
    `We emailed a code to ${maskEmail(email)}. It expires in ${OTP_TTL_MINUTES} minutes.`,
  );
}

/** Confirms the new email, then makes it the address future codes go to. */
export async function verifyMemberEmailChangeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = memberEmailChangeVerifySchema.safeParse({
    payToken: formData.get("payToken"),
    email: formData.get("email"),
    code: formData.get("code"),
  });
  if (!parsed.success) {
    return errorState("Please check the highlighted fields.", fieldErrors(parsed.error));
  }

  const { payToken, email, code } = parsed.data;
  const member = await requirePortalMemberAccess(payToken);
  if (!member) return errorState("Please verify this link before changing your email.");

  const result = await verifyMemberLinkCode(payToken, email, code, "EMAIL_CHANGE");
  if (!result.ok) return errorState(result.message);

  await prisma.memberLinkOtp.delete({ where: { id: result.id } }).catch(() => {});

  await prisma.$transaction(async (tx) => {
    await tx.member.update({ where: { id: member.id }, data: { email } });
    await tx.application.updateMany({ where: { memberId: member.id }, data: { email } });
    await logMemberChange(tx, {
      memberId: member.id,
      action: MEMBER_AUDIT_ACTIONS.EMAIL_CHANGED,
      actorName: "Member",
      summary: "Member confirmed a new email address",
      changes: [{ field: "email", label: "Email", old: member.email, new: email }],
    });
  });

  revalidatePortal(payToken);
  redirect(`/pay/${payToken}/email`);
}
