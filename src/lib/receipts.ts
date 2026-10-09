import "server-only";
import { LIBRARY_EMAIL, LIBRARY_NAME, paymentModeLabels } from "@/lib/constants";
import { formatMonth } from "@/lib/format";
import { toNumber } from "@/lib/ids";
import { prisma } from "@/lib/prisma";
import { buildReceiptPdf, receiptFilename, type ReceiptPdfInfo } from "@/lib/receipt-pdf";

/**
 * Everything the receipt actions share: reading the payment, assembling the
 * receipt fields, and sending the PDF by email.
 */

export type ReceiptContext = {
  info: ReceiptPdfInfo;
  /** Where the receipt can be emailed, when the member has an address. */
  email: string | null;
  mobile: string | null;
};

export async function getReceiptContext(paymentPk: number): Promise<ReceiptContext | null> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentPk },
    include: { member: { include: { seat: { include: { room: true } } } } },
  });
  if (!payment || payment.status !== "PAID") return null;

  const { member } = payment;
  const info: ReceiptPdfInfo = {
    memberName: member.name,
    memberId: member.memberId,
    memberMobile: member.mobile,
    seatLabel: member.seat
      ? `${member.seat.room ? `${member.seat.room.name} · ` : ""}Seat ${member.seat.seatNumber}`
      : null,
    paymentId: payment.paymentId,
    month: payment.month,
    amount: toNumber(payment.amount),
    mode: paymentModeLabels[payment.paymentMode],
    date: payment.paymentDate,
    remarks: payment.remarks,
  };

  return { info, email: member.email, mobile: member.mobile };
}

export async function buildReceiptBytes(paymentPk: number): Promise<
  { filename: string; bytes: Uint8Array; info: ReceiptPdfInfo } | null
> {
  const context = await getReceiptContext(paymentPk);
  if (!context) return null;
  const bytes = await buildReceiptPdf(context.info);
  return { filename: receiptFilename(context.info), bytes, info: context.info };
}

export function receiptEmailIsConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export type EmailResult = { ok: true } | { ok: false; error: string };

/**
 * Sends the receipt PDF as an email attachment through Resend.
 *
 * Resend is used over a plain SMTP client because it is free to start and needs
 * no server: a single HTTP call with the API key. Until the owner sets
 * RESEND_API_KEY (and verifies a sending domain) the feature reports that it is
 * not set up rather than failing silently.
 */
export async function sendReceiptEmail(to: string, info: ReceiptPdfInfo): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error: "Email is not set up yet. Add a Resend API key to start emailing receipts.",
    };
  }

  const from = process.env.RESEND_FROM ?? `${LIBRARY_NAME} <onboarding@resend.dev>`;
  const bytes = await buildReceiptPdf(info);

  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: LIBRARY_EMAIL,
        subject: `${LIBRARY_NAME} receipt for ${formatMonth(info.month)}`,
        html: [
          `<p>Dear ${info.memberName},</p>`,
          `<p>Please find attached your fee receipt for <strong>${formatMonth(info.month)}</strong>.</p>`,
          `<p>Receipt number: ${info.paymentId}</p>`,
          `<p>Thank you for your membership.</p>`,
          `<p>— ${LIBRARY_NAME}</p>`,
        ].join("\n"),
        attachments: [
          {
            filename: receiptFilename(info),
            content: Buffer.from(bytes).toString("base64"),
          },
        ],
      }),
    });
  } catch {
    return { ok: false, error: "Could not reach the email service. Check the connection and try again." };
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    return {
      ok: false,
      error: detail
        ? `The email service rejected the message: ${detail.slice(0, 160)}`
        : "The email service rejected the message.",
    };
  }

  return { ok: true };
}
