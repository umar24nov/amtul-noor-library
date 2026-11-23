import "server-only";
import { prisma } from "@/lib/prisma";
import {
  generateOtpCode,
  hashOtpCode,
  otpCodeMatches,
  otpExpiresAt,
  otpIsExpired,
  OTP_MAX_ATTEMPTS,
  OTP_MAX_REQUESTS,
  otpRequestWindowStart,
  otpRetryAfterMinutes,
} from "@/lib/otp-code";

/** Server-side storage and throttling for email sign-in codes. */

export type OtpLimitResult = {
  limited: boolean;
  retryAfterMinutes: number;
};

export type OtpVerifyResult =
  | { ok: true; id: number }
  | { ok: false; message: string };

export const OTP_INVALID_MESSAGE = "That code is invalid or has expired. Request a new one.";

/**
 * Counts recent code requests for this email, and for the client address when
 * there is one. Like the password lockout, a database failure must not lock the
 * owner out of their own account.
 */
export async function checkOtpRequestLimit(
  email: string,
  ip: string,
  now: Date = new Date(),
): Promise<OtpLimitResult> {
  const allow: OtpLimitResult = { limited: false, retryAfterMinutes: 0 };

  try {
    const recent = await prisma.loginOtp.findMany({
      where: {
        createdAt: { gte: otpRequestWindowStart(now) },
        OR: [{ email: email.toLowerCase() }, ...(ip ? [{ ip }] : [])],
      },
      select: { createdAt: true },
      orderBy: { createdAt: "desc" },
    });

    if (recent.length < OTP_MAX_REQUESTS) return allow;

    const oldest = recent[recent.length - 1]!.createdAt;
    return { limited: true, retryAfterMinutes: otpRetryAfterMinutes(oldest, now) };
  } catch {
    console.error("OTP request limit check failed; allowing the request");
    return allow;
  }
}

/**
 * Creates one hashed, short-lived code and prunes spent or stale rows. The
 * plain code is returned only to the caller so it can be emailed; it is never
 * written to the database.
 */
export async function createOtpRequest(
  email: string,
  ip: string,
): Promise<{ id: number; code: string }> {
  const normalisedEmail = email.toLowerCase();
  const code = generateOtpCode();
  const staleBefore = new Date(Date.now() - 24 * 60 * 60_000);

  const [, created] = await prisma.$transaction([
    // A newer code replaces any older one for this email, so there is never
    // ambiguity about which code the email actually contained.
    prisma.loginOtp.updateMany({
      where: { email: normalisedEmail, consumedAt: null },
      data: { consumedAt: new Date() },
    }),
    prisma.loginOtp.create({
      data: {
        email: normalisedEmail,
        codeHash: hashOtpCode(normalisedEmail, code),
        expiresAt: otpExpiresAt(),
        ip,
      },
      select: { id: true },
    }),
    prisma.loginOtp.deleteMany({
      where: {
        createdAt: { lt: staleBefore },
        OR: [{ consumedAt: { not: null } }, { expiresAt: { lt: new Date() } }],
      },
    }),
  ]);

  return { id: created!.id, code };
}

/** Deletes a request whose email could not be delivered. */
export async function discardOtpRequest(id: number): Promise<void> {
  try {
    await prisma.loginOtp.delete({ where: { id } });
  } catch {
    // Best effort: the code is short-lived and can never be used after expiry.
  }
}

/**
 * Checks the newest live code for an email. Wrong guesses are counted on the
 * row; the row is claimed with a conditional update so two submissions of the
 * same code cannot both succeed.
 */
export async function verifyOtpCode(email: string, code: string): Promise<OtpVerifyResult> {
  const normalisedEmail = email.toLowerCase();
  const row = await prisma.loginOtp.findFirst({
    where: { email: normalisedEmail, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (
    !row ||
    otpIsExpired(row.expiresAt) ||
    row.attempts >= OTP_MAX_ATTEMPTS
  ) {
    return { ok: false, message: OTP_INVALID_MESSAGE };
  }

  if (!otpCodeMatches(normalisedEmail, code, row.codeHash)) {
    await prisma.loginOtp.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
    return { ok: false, message: "That code is not correct." };
  }

  const claimed = await prisma.loginOtp.updateMany({
    where: { id: row.id, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  if (claimed.count !== 1) {
    return { ok: false, message: OTP_INVALID_MESSAGE };
  }

  return { ok: true, id: row.id };
}
