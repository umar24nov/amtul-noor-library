import assert from "node:assert/strict";
import test from "node:test";
import {
  generateOtpCode,
  hashOtpCode,
  otpCodeMatches,
  otpExpiresAt,
  otpIsExpired,
  otpRequestWindowStart,
  otpRetryAfterMinutes,
  OTP_DIGITS,
  OTP_TTL_MINUTES,
} from "./otp-code";

process.env.AUTH_SECRET = "test-auth-secret-that-is-long-enough-for-hs256";

const EMAIL = "Umar@AmtulNoorLibrary.in";
const CODE = "042517";

test("generated codes are always six digits", () => {
  for (let i = 0; i < 50; i += 1) {
    assert.match(generateOtpCode(), new RegExp(`^\\d{${OTP_DIGITS}}$`));
  }
});

test("codes are hashed with the normalised email and cannot be read back", () => {
  const hash = hashOtpCode(EMAIL, CODE);

  assert.equal(hash, hashOtpCode("umar@amtulnoorlibrary.in", CODE));
  assert.equal(hash.length, 64);
  assert.ok(!hash.includes(CODE));
  assert.notEqual(hash, hashOtpCode(EMAIL, "042518"));
  assert.notEqual(hash, hashOtpCode("someoneelse@example.com", CODE));
});

test("only the matching email and code verify", () => {
  const hash = hashOtpCode(EMAIL, CODE);

  assert.equal(otpCodeMatches(EMAIL, CODE, hash), true);
  assert.equal(otpCodeMatches("  umar@amtulnoorlibrary.in ", CODE, hash), true);
  assert.equal(otpCodeMatches(EMAIL, "000000", hash), false);
  assert.equal(otpCodeMatches("other@example.com", CODE, hash), false);
  assert.equal(otpCodeMatches(EMAIL, CODE, "not-a-hash"), false);
});

test("codes expire after the short window, including at the boundary", () => {
  const now = new Date("2026-11-23T10:00:00.000Z");
  const expiresAt = otpExpiresAt(now);

  assert.equal((expiresAt.getTime() - now.getTime()) / 60_000, OTP_TTL_MINUTES);
  assert.equal(otpIsExpired(expiresAt, new Date(expiresAt.getTime() - 1)), false);
  assert.equal(otpIsExpired(expiresAt, expiresAt), true);
  assert.equal(otpIsExpired(expiresAt, new Date(expiresAt.getTime() + 1)), true);
});

test("the request window and cooldown are calculated from the newest limit", () => {
  const now = new Date("2026-11-23T10:00:00.000Z");

  assert.equal(otpRequestWindowStart(now).getTime(), now.getTime() - 15 * 60_000);
  assert.equal(otpRetryAfterMinutes(now, now), 15);
  assert.equal(otpRetryAfterMinutes(new Date(now.getTime() - 10 * 60_000), now), 5);
  assert.equal(otpRetryAfterMinutes(new Date(now.getTime() - 16 * 60_000), now), 1);
});
