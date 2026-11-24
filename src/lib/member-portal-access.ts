import type { MemberStatus } from "@/generated/prisma/enums";

/**
 * The member portal is granted by the library, not by a link alone. An approved
 * application creates an ACTIVE member; marking that member LEFT withdraws the
 * right to sign in and invalidates any cookie already issued.
 */
export function memberCanUsePortal(status: MemberStatus | string | null | undefined): boolean {
  return status === "ACTIVE";
}

/** Both sign-in screens use this so LEFT members never receive a code. */
export function memberPortalCredentialsMatch(input: {
  status: MemberStatus | string | null | undefined;
  savedEmail: string | null;
  enteredEmail: string;
  savedPayToken: string | null;
}): boolean {
  return Boolean(
    memberCanUsePortal(input.status) &&
      input.savedEmail &&
      input.savedPayToken &&
      input.savedEmail.toLowerCase() === input.enteredEmail.toLowerCase(),
  );
}

/** A signed cookie only opens the portal while the member is still ACTIVE. */
export function memberPortalCookieAllowed(input: {
  status: MemberStatus | string | null | undefined;
  access: { memberId: number; payToken: string } | null;
  expected: { memberId: number; payToken: string | null };
}): boolean {
  if (!memberCanUsePortal(input.status) || !input.access || !input.expected.payToken) return false;
  return (
    input.access.memberId === input.expected.memberId &&
    input.access.payToken === input.expected.payToken
  );
}
