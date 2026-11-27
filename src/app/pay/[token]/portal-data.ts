import "server-only";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { currentMonthKey, normalizeSeatNumber, shiftMonthKey } from "@/lib/format";
import { memberPortalCookieAllowed } from "@/lib/member-portal-access";
import { getMemberLinkAccess } from "@/lib/member-link-auth";
import { canAny, getSession } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { effectiveMemberFee, getMemberFee, getMonthlyFee } from "@/lib/settings";
import { bankDetailsConfigured, getBankDetails } from "@/lib/upi";
import { whatsappChatUrl } from "@/lib/whatsapp";

const PAY_TOKEN_PATTERN = /^[0-9a-f]{24,64}$/;

export function assertPayToken(token: string): void {
  if (!PAY_TOKEN_PATTERN.test(token)) notFound();
}

/** Only the fields the shared portal bar needs. */
export async function loadMemberIdentity(token: string) {
  assertPayToken(token);
  const member = await prisma.member.findUnique({
    where: { payToken: token },
    select: { id: true, memberId: true, name: true, email: true },
  });
  if (!member) notFound();
  return member;
}

/** The full record, including the seat and every payment month. */
export async function loadMemberFull(token: string) {
  assertPayToken(token);
  const member = await prisma.member.findUnique({
    where: { payToken: token },
    include: {
      seat: true,
      payments: { orderBy: [{ month: "desc" }, { createdAt: "desc" }] },
    },
  });
  if (!member) notFound();
  return member;
}

export type PortalMember = NonNullable<Awaited<ReturnType<typeof loadMemberFull>>>;

/**
 * Loads the record and checks this link's access together. Pages call this
 * before rendering anything so a blocked visitor never receives member details
 * in the response, including the React Server Component payload.
 */
export async function loadPortal(token: string) {
  const member = await loadMemberFull(token);
  const access = await getPortalAccess(token, { id: member.id, status: member.status });
  return { member, ...access };
}

/**
 * Staff may inspect any member page, but only a member holding the access cookie
 * for this exact link may use the self-service forms. The layout uses this to
 * open the door; the pages use it to decide which controls to show.
 */
export async function getPortalAccess(
  token: string,
  member: { id: number; status: "ACTIVE" | "LEFT" },
) {
  const [session, access] = await Promise.all([getSession(), getMemberLinkAccess()]);
  const staffAllowed = Boolean(
    session && canAny(session, ["MEMBERS", "PAYMENTS", "PAYMENTS_VIEW"]),
  );
  const memberAllowed = memberPortalCookieAllowed({
    status: member.status,
    access,
    expected: { memberId: member.id, payToken: token },
  });
  return { staffAllowed, memberAllowed, allowed: staffAllowed || memberAllowed };
}

/**
 * The only way a member write action gets a record. It requires the signed
 * member cookie for this exact pay link and re-checks the id against the
 * database, so a staff session or a cookie from another member is never enough.
 */
export async function requirePortalMemberAccess(token: string) {
  assertPayToken(token);
  const access = await getMemberLinkAccess();
  if (!access || access.payToken !== token) return null;

  const member = await prisma.member.findUnique({
    where: { payToken: token },
    select: {
      id: true,
      status: true,
      name: true,
      mobile: true,
      email: true,
      guardianName: true,
      guardianMobile: true,
    },
  });
  if (
    !member ||
    !memberPortalCookieAllowed({
      status: member.status,
      access,
      expected: { memberId: member.id, payToken: token },
    })
  ) {
    return null;
  }
  return member;
}

/** Every member page shows the name, so every member page must be refreshed. */
export function revalidatePortal(token: string): void {
  const paths = [
    `/pay/${token}`,
    `/pay/${token}/details`,
    `/pay/${token}/payments`,
    `/pay/${token}/payments/history`,
    `/pay/${token}/email`,
    `/pay/${token}/support`,
    `/pay/${token}/settings`,
  ];
  for (const path of paths) revalidatePath(path);
}

/** Fee, due month and counts shared by the home and payment pages. */
export async function getFeeSummary(member: PortalMember) {
  const [standardFee, memberFee] = await Promise.all([
    getMonthlyFee(),
    getMemberFee(member.id),
  ]);
  const monthlyFee = effectiveMemberFee(memberFee, standardFee);

  const soonestPending = [...member.payments]
    .filter((payment) => payment.status === "PENDING")
    .sort((a, b) => a.month.localeCompare(b.month))[0];
  const dueMonth = soonestPending?.month ?? shiftMonthKey(currentMonthKey(), 1);
  // Always quote the member's own current fee. A pending row may have been
  // created before the fee was last changed, so its amount can be stale.
  const dueAmount = monthlyFee;
  const feeIsZero = monthlyFee <= 0;

  const receiptCount = member.payments.filter(
    (payment) => payment.status === "PAID" && payment.receiptToken,
  ).length;
  const pendingCount = member.payments.filter((payment) => payment.status === "PENDING").length;

  return {
    monthlyFee,
    dueMonth,
    dueAmount,
    feeIsZero,
    receiptCount,
    pendingCount,
    bankConfigured: bankDetailsConfigured(),
    bank: getBankDetails(),
  };
}

export function getSeatLabel(member: PortalMember): string {
  if (!member.seat) return "—";
  return `${normalizeSeatNumber(member.seat.seatNumber)}${member.seat.hasLocker ? " · locker" : ""}`;
}

export function getSupportUrl(member: { name: string; memberId: string }): string {
  return whatsappChatUrl(
    `Hi, I am ${member.name} (${member.memberId}). I need help with my library membership.`,
  );
}
