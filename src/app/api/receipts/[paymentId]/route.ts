import { requireSession } from "@/lib/export-response";
import { buildReceiptBytes } from "@/lib/receipts";

/**
 * Serves the receipt PDF for one payment. Kept as a route (not a server action)
 * so the browser can download it as a file, and so it can be linked from the
 * receipt email later if needed.
 */
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  const denied = await requireSession();
  if (denied) return denied;

  const { paymentId } = await params;
  const id = Number(paymentId);
  if (!Number.isInteger(id) || id <= 0) {
    return new Response("Receipt not found.", { status: 404 });
  }

  const receipt = await buildReceiptBytes(id);
  if (!receipt) return new Response("Receipt not found.", { status: 404 });

  return new Response(new Uint8Array(receipt.bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${receipt.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
