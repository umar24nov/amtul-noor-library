import assert from "node:assert/strict";
import test from "node:test";
import {
  generateOtpCode,
  hashMemberLinkCode,
  hashOtpCode,
  memberLinkCodeMatches,
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
const PAY_TOKEN = "0c984abc68cb49bdafdbcbf717f0702d";

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

test("member-link codes are bound to the link and can never verify as admin codes", () => {
  const hash = hashMemberLinkCode(PAY_TOKEN, EMAIL, CODE);

  assert.equal(hash, hashMemberLinkCode(PAY_TOKEN, "umar@amtulnoorlibrary.in", CODE));
  assert.notEqual(hash, hashMemberLinkCode("another-token", EMAIL, CODE));
  assert.notEqual(hash, hashMemberLinkCode(PAY_TOKEN, EMAIL, "042518"));
  assert.notEqual(hash, hashOtpCode(EMAIL, CODE));

  assert.equal(memberLinkCodeMatches(PAY_TOKEN, EMAIL, CODE, hash), true);
  assert.equal(memberLinkCodeMatches(PAY_TOKEN, EMAIL, "000000", hash), false);
  assert.equal(memberLinkCodeMatches("another-token", EMAIL, CODE, hash), false);
  assert.equal(memberLinkCodeMatches(PAY_TOKEN, "other@example.com", CODE, hash), false);
  assert.equal(memberLinkCodeMatches(PAY_TOKEN, EMAIL, CODE, hashOtpCode(EMAIL, CODE)), false);
  assert.equal(otpCodeMatches(EMAIL, CODE, hash), false);
});

test("an email-change code can never be replayed as a sign-in code, or vice versa", () => {
  const accessHash = hashMemberLinkCode(PAY_TOKEN, EMAIL, CODE, "ACCESS");
  const changeHash = hashMemberLinkCode(PAY_TOKEN, EMAIL, CODE, "EMAIL_CHANGE");

  // Same link, email and code, but the two purposes hash differently.
  assert.notEqual(accessHash, changeHash);

  // Each purpose only verifies against its own hash.
  assert.equal(memberLinkCodeMatches(PAY_TOKEN, EMAIL, CODE, accessHash, "ACCESS"), true);
  assert.equal(memberLinkCodeMatches(PAY_TOKEN, EMAIL, CODE, changeHash, "EMAIL_CHANGE"), true);
  assert.equal(memberLinkCodeMatches(PAY_TOKEN, EMAIL, CODE, accessHash, "EMAIL_CHANGE"), false);
  assert.equal(memberLinkCodeMatches(PAY_TOKEN, EMAIL, CODE, changeHash, "ACCESS"), false);

  // The default purpose stays ACCESS, so older callers are unchanged.
  assert.equal(hashMemberLinkCode(PAY_TOKEN, EMAIL, CODE), accessHash);
});
