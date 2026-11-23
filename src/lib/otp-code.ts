import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

/**
 * The small, database-free part of email-code sign-in. Keeping it separate from
 * the Prisma-backed store lets the code rules be tested without a database.
 */

export const OTP_DIGITS = 6;
/** A code older than this is refused, even if it was never used. */
export const OTP_TTL_MINUTES = 10;
/** Codes per email (or IP) before a cooldown applies. */
export const OTP_MAX_REQUESTS = 3;
export const OTP_REQUEST_WINDOW_MINUTES = 15;
/** Wrong submissions allowed for one code before it is spent. */
export const OTP_MAX_ATTEMPTS = 5;

function secretKey(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set to a random string of at least 32 characters.");
  }
  return Buffer.from(secret, "utf8");
}

/** A uniformly random, zero-padded 6 digit code. */
export function generateOtpCode(): string {
  return randomInt(10 ** OTP_DIGITS).toString().padStart(OTP_DIGITS, "0");
}

/**
 * Codes are stored as an HMAC rather than plain text, so a database read alone
 * cannot reveal one. Binding the email to the hash stops a code being moved to
 * a different account.
 */
export function hashOtpCode(email: string, code: string): string {
  return createHmac("sha256", secretKey())
    .update(`${email.trim().toLowerCase()}:${code}`)
    .digest("hex");
}

/** Constant-time comparison of two hex hashes. */
function hashesMatch(actualHash: string, expectedHash: string): boolean {
  const actual = Buffer.from(actualHash, "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Constant-time comparison against the stored hash. */
export function otpCodeMatches(email: string, code: string, expectedHash: string): boolean {
  return hashesMatch(hashOtpCode(email, code), expectedHash);
}

/**
 * Member-link codes are bound to the permanent pay token as well as the email,
 * so a code from one member's link cannot unlock another member's link even if
 * two members share an address. The distinct prefix also keeps these codes from
 * ever verifying as an admin password-recovery code.
 */
export type MemberLinkOtpPurpose = "ACCESS" | "EMAIL_CHANGE";

function memberLinkPrefix(purpose: MemberLinkOtpPurpose): string {
  return purpose === "EMAIL_CHANGE" ? "member-email-change" : "member-link";
}

export function hashMemberLinkCode(
  payToken: string,
  email: string,
  code: string,
  purpose: MemberLinkOtpPurpose = "ACCESS",
): string {
  return createHmac("sha256", secretKey())
    .update(`${memberLinkPrefix(purpose)}:${payToken}:${email.trim().toLowerCase()}:${code}`)
    .digest("hex");
}

export function memberLinkCodeMatches(
  payToken: string,
  email: string,
  code: string,
  expectedHash: string,
  purpose: MemberLinkOtpPurpose = "ACCESS",
): boolean {
  return hashesMatch(hashMemberLinkCode(payToken, email, code, purpose), expectedHash);
}

export function otpExpiresAt(now: Date = new Date()): Date {
  return new Date(now.getTime() + OTP_TTL_MINUTES * 60_000);
}

export function otpIsExpired(expiresAt: Date, now: Date = new Date()): boolean {
  return expiresAt.getTime() <= now.getTime();
}

export function otpRequestWindowStart(now: Date = new Date()): Date {
  return new Date(now.getTime() - OTP_REQUEST_WINDOW_MINUTES * 60_000);
}

/** Whole minutes before the oldest request in the window ages out. */
export function otpRetryAfterMinutes(oldest: Date, now: Date = new Date()): number {
  const ageMinutes = Math.ceil((now.getTime() - oldest.getTime()) / 60_000);
  return Math.max(1, OTP_REQUEST_WINDOW_MINUTES - ageMinutes);
}
