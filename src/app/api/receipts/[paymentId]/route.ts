import { requireExportAny } from "@/lib/export-response";
import { logMemberActivity, MEMBER_AUDIT_ACTIONS } from "@/lib/member-audit";
import { prisma } from "@/lib/prisma";
import { buildReceiptBytes } from "@/lib/receipts";

/**
 * Serves the receipt PDF for one payment. Kept as a route (not a server action)
 * so the browser can download it as a file, and so it can be linked from the
 * receipt email later if needed.
 *
 * A receipt is part of looking at a payment, so the read-only payments
 * permission may fetch one too.
 */
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  const denied = await requireExportAny(["PAYMENTS", "PAYMENTS_VIEW"]);
  if (denied) return denied;

  const { paymentId } = await params;
  const id = Number(paymentId);
  if (!Number.isInteger(id) || id <= 0) {
    return new Response("Receipt not found.", { status: 404 });
  }

  const payment = await prisma.payment.findUnique({
    where: { id },
    select: { memberId: true, month: true },
  });
  if (!payment) return new Response("Receipt not found.", { status: 404 });

  const receipt = await buildReceiptBytes(id);
  if (!receipt) return new Response("Receipt not found.", { status: 404 });

  await logMemberActivity(payment.memberId, MEMBER_AUDIT_ACTIONS.RECEIPT_DOWNLOADED, {
    actorName: null,
    metadata: {
      channel: "Staff receipt route",
      month: payment.month,
      paymentId: id,
    },
  });

  return new Response(new Uint8Array(receipt.bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${receipt.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
