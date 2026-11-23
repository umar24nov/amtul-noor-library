import { SignJWT, jwtVerify } from "jose";

/**
 * The signed token inside a member's payment-link access cookie.
 *
 * Kept separate from the cookie helpers so the signing rules can be tested
 * without Next.js request state. It carries only the link token and member id:
 * no staff permissions, no email, and no ability to reset a staff password.
 */

export const MEMBER_LINK_ACCESS_SECONDS = 60 * 60 * 12;

export type MemberLinkAccess = {
  memberId: number;
  payToken: string;
};

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set to a random string of at least 32 characters.");
  }
  return new TextEncoder().encode(secret);
}

export async function signMemberLinkAccess(payload: MemberLinkAccess): Promise<string> {
  return new SignJWT({ memberId: payload.memberId, payToken: payload.payToken })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MEMBER_LINK_ACCESS_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifyMemberLinkAccess(token: string): Promise<MemberLinkAccess | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (typeof payload.memberId !== "number" || typeof payload.payToken !== "string") return null;
    return { memberId: payload.memberId, payToken: payload.payToken };
  } catch {
    return null;
  }
}
