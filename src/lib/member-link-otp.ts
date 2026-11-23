import "server-only";
import { prisma } from "@/lib/prisma";
import {
  generateOtpCode,
  hashMemberLinkCode,
  memberLinkCodeMatches,
  otpExpiresAt,
  otpIsExpired,
  OTP_MAX_ATTEMPTS,
  OTP_MAX_REQUESTS,
  otpRequestWindowStart,
  otpRetryAfterMinutes,
} from "@/lib/otp-code";

/** Storage and throttling for the codes that unlock a member's /pay link. */

export type OtpLimitResult = {
  limited: boolean;
  retryAfterMinutes: number;
};

export type MemberLinkVerifyResult = { ok: true; id: number } | { ok: false; message: string };

export const MEMBER_LINK_CODE_INVALID = "That code is invalid or has expired. Request a new one.";

/** Mirrors the recovery limiter: count by link and by client address. */
export async function checkMemberLinkOtpLimit(
  payToken: string,
  ip: string,
  now: Date = new Date(),
): Promise<OtpLimitResult> {
  const allow: OtpLimitResult = { limited: false, retryAfterMinutes: 0 };

  try {
    const recent = await prisma.memberLinkOtp.findMany({
      where: {
        createdAt: { gte: otpRequestWindowStart(now) },
        OR: [{ payToken }, ...(ip ? [{ ip }] : [])],
      },
      select: { createdAt: true },
      orderBy: { createdAt: "desc" },
    });

    if (recent.length < OTP_MAX_REQUESTS) return allow;

    const oldest = recent[recent.length - 1]!.createdAt;
    return { limited: true, retryAfterMinutes: otpRetryAfterMinutes(oldest, now) };
  } catch {
    console.error("member link OTP limit check failed; allowing the request");
    return allow;
  }
}

/**
 * Creates one hashed code for this pay link and invalidates any earlier code
 * for the same link, so only the code in the latest email works.
 */
export async function createMemberLinkOtpRequest(
  payToken: string,
  email: string,
  ip: string,
): Promise<{ id: number; code: string }> {
  const normalisedEmail = email.trim().toLowerCase();
  const code = generateOtpCode();
  const staleBefore = new Date(Date.now() - 24 * 60 * 60_000);

  const [, created] = await prisma.$transaction([
    prisma.memberLinkOtp.updateMany({
      where: { payToken, consumedAt: null },
      data: { consumedAt: new Date() },
    }),
    prisma.memberLinkOtp.create({
      data: {
        payToken,
        email: normalisedEmail,
        codeHash: hashMemberLinkCode(payToken, normalisedEmail, code),
        expiresAt: otpExpiresAt(),
        ip,
      },
      select: { id: true },
    }),
    prisma.memberLinkOtp.deleteMany({
      where: {
        createdAt: { lt: staleBefore },
        OR: [{ consumedAt: { not: null } }, { expiresAt: { lt: new Date() } }],
      },
    }),
  ]);

  return { id: created!.id, code };
}

/** Deletes a request whose email could not be delivered. */
export async function discardMemberLinkOtpRequest(id: number): Promise<void> {
  try {
    await prisma.memberLinkOtp.delete({ where: { id } });
  } catch {
    // Best effort: the code expires on its own and cannot be read from the row.
  }
}

/** Checks the newest live code for this link; claiming it is atomic. */
export async function verifyMemberLinkCode(
  payToken: string,
  email: string,
  code: string,
): Promise<MemberLinkVerifyResult> {
  const normalisedEmail = email.trim().toLowerCase();
  const row = await prisma.memberLinkOtp.findFirst({
    where: { payToken, email: normalisedEmail, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!row || otpIsExpired(row.expiresAt) || row.attempts >= OTP_MAX_ATTEMPTS) {
    return { ok: false, message: MEMBER_LINK_CODE_INVALID };
  }

  if (!memberLinkCodeMatches(payToken, normalisedEmail, code, row.codeHash)) {
    await prisma.memberLinkOtp.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
    return { ok: false, message: "That code is not correct." };
  }

  const claimed = await prisma.memberLinkOtp.updateMany({
    where: { id: row.id, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  if (claimed.count !== 1) {
    return { ok: false, message: MEMBER_LINK_CODE_INVALID };
  }

  return { ok: true, id: row.id };
}
