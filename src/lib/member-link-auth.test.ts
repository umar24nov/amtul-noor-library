import assert from "node:assert/strict";
import test from "node:test";
import { SignJWT } from "jose";
import {
  MEMBER_LINK_ACCESS_SECONDS,
  signMemberLinkAccess,
  verifyMemberLinkAccess,
} from "./member-link-token";

process.env.AUTH_SECRET = "test-auth-secret-that-is-long-enough-for-hs256";

const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET);
const ACCESS = { memberId: 42, payToken: "0c984abc68cb49bdafdbcbf717f0702d" };

test("a member access token carries only the link and member, and lasts 12 hours", async () => {
  const token = await signMemberLinkAccess(ACCESS);

  assert.deepEqual(await verifyMemberLinkAccess(token), ACCESS);

  const payload = JSON.parse(Buffer.from(token.split(".")[1]!, "base64url").toString("utf8"));
  assert.equal(payload.memberId, ACCESS.memberId);
  assert.equal(payload.payToken, ACCESS.payToken);
  assert.equal(payload.exp - payload.iat, MEMBER_LINK_ACCESS_SECONDS);
  assert.equal("email" in payload, false);
  assert.equal("permissions" in payload, false);
});

test("tampered, expired and wrong-purpose tokens are refused", async () => {
  const token = await signMemberLinkAccess(ACCESS);
  assert.equal(await verifyMemberLinkAccess(`${token}tampered`), null);

  const expired = await new SignJWT(ACCESS)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(new Date(Date.now() - 60_000))
    .sign(SECRET);
  assert.equal(await verifyMemberLinkAccess(expired), null);

  const staffShaped = await new SignJWT({ email: "staff@example.com", userId: 42 })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(SECRET);
  assert.equal(await verifyMemberLinkAccess(staffShaped), null);

  const wrongSecret = await new SignJWT(ACCESS)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(new TextEncoder().encode("a-different-secret-that-is-also-long-enough"));
  assert.equal(await verifyMemberLinkAccess(wrongSecret), null);
});
