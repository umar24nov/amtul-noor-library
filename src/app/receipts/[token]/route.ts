import { redirect } from "next/navigation";
import { buildReceiptBytes } from "@/lib/receipts";
import { memberPortalCookieAllowed } from "@/lib/member-portal-access";
import { logMemberActivity, MEMBER_AUDIT_ACTIONS } from "@/lib/member-audit";
import { getMemberLinkAccess } from "@/lib/member-link-auth";
import { canAny, getSession } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Download one member's receipt.
 *
 * Receipts used to be bearer links: anybody holding the token could fetch the
 * PDF. They are now behind the same email-code gate as the payment page — either
 * the visitor has a valid access cookie for that member's pay link, or they are
 * signed in as staff with permission to see payments. A direct receipt link
 * simply bounces to the pay page, where the member can request a code.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!/^[0-9a-f]{24,64}$/.test(token)) {
    return new Response("Receipt not found.", { status: 404 });
  }

  const payment = await prisma.payment.findUnique({
    where: { receiptToken: token },
    select: {
      id: true,
      month: true,
      status: true,
      memberId: true,
      member: { select: { payToken: true, status: true } },
    },
  });
  if (!payment || payment.status !== "PAID") {
    return new Response("Receipt not found.", { status: 404 });
  }

  const [session, access] = await Promise.all([getSession(), getMemberLinkAccess()]);
  const staffAllowed = Boolean(
    session && canAny(session, ["MEMBERS", "PAYMENTS", "PAYMENTS_VIEW"]),
  );
  const memberAllowed = memberPortalCookieAllowed({
    status: payment.member.status,
    access,
    expected: { memberId: payment.memberId, payToken: payment.member.payToken },
  });

  if (!staffAllowed && !memberAllowed) {
    const payToken = payment.member.payToken;
    if (payToken && /^[0-9a-f]{24,64}$/.test(payToken)) {
      redirect(`/pay/${payToken}`);
    }
    return new Response("Receipt not found.", { status: 404 });
  }

  const receipt = await buildReceiptBytes(payment.id);
  if (!receipt) {
    return new Response("Receipt not found.", { status: 404 });
  }

  await logMemberActivity(payment.memberId, MEMBER_AUDIT_ACTIONS.RECEIPT_DOWNLOADED, {
    actorName: staffAllowed ? null : "Member",
    metadata: {
      channel: staffAllowed ? "Staff link" : "Member link",
      month: payment.month,
      paymentId: payment.id,
    },
  });

  return new Response(Buffer.from(receipt.bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${receipt.filename}"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
