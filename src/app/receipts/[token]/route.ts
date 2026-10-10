import { buildReceiptBytes } from "@/lib/receipts";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Public download of one member's receipt.
 *
 * The member has no login, so their only way to fetch a receipt is this link.
 * It is addressed by a 144-bit token rather than by payment id, which keeps it
 * unguessable: the token is generated when the payment is created and can be
 * handed to the member on WhatsApp or in person. Only a PAID payment yields a
 * receipt, mirroring what the signed-in download endpoint allows.
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
    select: { id: true, status: true },
  });
  if (!payment || payment.status !== "PAID") {
    return new Response("Receipt not found.", { status: 404 });
  }

  const receipt = await buildReceiptBytes(payment.id);
  if (!receipt) {
    return new Response("Receipt not found.", { status: 404 });
  }

  return new Response(Buffer.from(receipt.bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${receipt.filename}"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}