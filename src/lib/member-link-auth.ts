import "server-only";
import { cookies } from "next/headers";
import {
  MEMBER_LINK_ACCESS_SECONDS,
  signMemberLinkAccess,
  verifyMemberLinkAccess,
  type MemberLinkAccess,
} from "@/lib/member-link-token";

/**
 * A short-lived, signed cookie issued after a member enters the code emailed to
 * their address. It is a separate cookie with a separate purpose from the admin
 * session, so a member can never gain staff access.
 */

export const MEMBER_LINK_COOKIE = "anl_member_link";
export { MEMBER_LINK_ACCESS_SECONDS } from "@/lib/member-link-token";
export type { MemberLinkAccess } from "@/lib/member-link-token";

export async function createMemberLinkAccess(payload: MemberLinkAccess): Promise<void> {
  const token = await signMemberLinkAccess(payload);
  const cookieStore = await cookies();
  cookieStore.set(MEMBER_LINK_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MEMBER_LINK_ACCESS_SECONDS,
  });
}

export async function getMemberLinkAccess(): Promise<MemberLinkAccess | null> {
  const token = (await cookies()).get(MEMBER_LINK_COOKIE)?.value;
  if (!token) return null;
  return verifyMemberLinkAccess(token);
}

export async function destroyMemberLinkAccess(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(MEMBER_LINK_COOKIE);
}
