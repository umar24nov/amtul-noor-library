import "server-only";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { LIBRARY_ADDRESS, LIBRARY_EMAIL, LIBRARY_NAME, LIBRARY_PHONE } from "@/lib/constants";
import { formatDate, formatNumber } from "@/lib/format";

/**
 * A receipt is rendered as a PDF on the server so the exact same document can be
 * downloaded, emailed as an attachment, and (by attaching it in the chat) sent on
 * WhatsApp. Every path shares this one function.
 */

export type ReceiptPdfInfo = {
  memberName: string;
  memberId: string;
  memberMobile: string | null;
  seatLabel: string | null;
  paymentId: string;
  month: string;
  amount: number;
  mode: string;
  date: Date;
  remarks: string | null;
};

/**
 * pdf-lib's standard fonts are Latin-1 only, so anything outside that range
 * (for example the rupee glyph) would throw. The rupee sign is written as "Rs."
 * and stray unsupported characters are dropped, keeping a receipt renderable no
 * matter what a name or remark contains.
 */
function safe(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .normalize("NFKD")
    .replace(/[\u20B9]/g, "Rs.")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "")
    .trim();
}

function money(value: number): string {
  const hasFraction = Math.round(value * 100) % 100 !== 0;
  return `Rs. ${formatNumber(Number(value.toFixed(hasFraction ? 2 : 0)))}`;
}

export async function buildReceiptPdf(info: ReceiptPdfInfo): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Receipt ${safe(info.paymentId)}`);
  pdf.setAuthor(safe(LIBRARY_NAME));
  pdf.setSubject(`Fee receipt for ${safe(info.memberName)}`);

  const page = pdf.addPage([595.28, 841.89]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const ink = rgb(0.1, 0.12, 0.15);
  const muted = rgb(0.42, 0.45, 0.5);
  const accent = rgb(0.09, 0.35, 0.24);
  const line = rgb(0.82, 0.84, 0.86);

  const margin = 56;
  const width = 595.28;
  const contentRight = width - margin;
  let y = 792;

  const put = (
    text: string,
    x: number,
    yy: number,
    options: { size?: number; bold?: boolean; color?: typeof ink } = {},
  ) => {
    const size = options.size ?? 11;
    page.drawText(safe(text), {
      x,
      y: yy,
      size,
      font: options.bold ? bold : font,
      color: options.color ?? ink,
    });
  };

  const putRight = (
    text: string,
    right: number,
    yy: number,
    options: { size?: number; bold?: boolean; color?: typeof ink } = {},
  ) => {
    const size = options.size ?? 11;
    const chosen = options.bold ? bold : font;
    const clean = safe(text);
    page.drawText(clean, {
      x: right - chosen.widthOfTextAtSize(clean, size),
      y: yy,
      size,
      font: chosen,
      color: options.color ?? ink,
    });
  };

  put(LIBRARY_NAME, margin, y, { size: 22, bold: true });
  put("FEE RECEIPT", contentRight - 96, y + 2, { size: 12, bold: true, color: accent });
  y -= 20;
  put(LIBRARY_ADDRESS, margin, y, { size: 9, color: muted });
  y -= 13;
  put(`Phone: ${LIBRARY_PHONE}   Email: ${LIBRARY_EMAIL}`, margin, y, {
    size: 9,
    color: muted,
  });

  y -= 18;
  page.drawLine({
    start: { x: margin, y },
    end: { x: contentRight, y },
    thickness: 1.5,
    color: accent,
  });

  // Receipt meta on the right half.
  y -= 28;
  const metaTop = y;
  putRight("Receipt no.", contentRight, y, { size: 10, color: muted });
  y -= 15;
  putRight(info.paymentId, contentRight, y, { size: 12, bold: true });
  y -= 22;
  putRight("Date", contentRight, y, { size: 10, color: muted });
  y -= 15;
  putRight(formatDate(info.date), contentRight, y, { size: 12, bold: true });

  // "Received from" block on the left, lined up with the meta block.
  let leftY = metaTop;
  put("Received from", margin, leftY, { size: 10, color: muted });
  leftY -= 18;
  put(info.memberName, margin, leftY, { size: 16, bold: true });
  leftY -= 17;
  put(
    [info.memberId, info.memberMobile].filter(Boolean).join("  ·  "),
    margin,
    leftY,
    { size: 11, color: muted },
  );
  if (info.seatLabel) {
    leftY -= 15;
    put(info.seatLabel, margin, leftY, { size: 11, color: muted });
  }

  // Detail table.
  const rows: [string, string][] = [
    ["Fee per month", money(info.amount)],
    ["Payment mode", info.mode],
    ["Payment date", formatDate(info.date)],
    ["Remarks", info.remarks || "—"],
  ];

  const tableY = Math.min(leftY, y) - 34;
  const rowHeight = 34;
  page.drawRectangle({
    x: margin,
    y: tableY - rows.length * rowHeight,
    width: contentRight - margin,
    height: rows.length * rowHeight,
    borderColor: line,
    borderWidth: 1,
    color: rgb(0.985, 0.988, 0.99),
  });

  rows.forEach(([label, value], index) => {
    const rowTop = tableY - index * rowHeight;
    if (index > 0) {
      page.drawLine({
        start: { x: margin, y: rowTop },
        end: { x: contentRight, y: rowTop },
        thickness: 0.75,
        color: line,
      });
    }
    put(label, margin + 16, rowTop - 21, { size: 11, color: muted });
    put(value, margin + 170, rowTop - 21, { size: 11, bold: true });
  });

  // Amount box.
  const amountTop = tableY - rows.length * rowHeight - 28;
  page.drawRectangle({
    x: margin,
    y: amountTop - 54,
    width: contentRight - margin,
    height: 54,
    color: rgb(0.09, 0.35, 0.24),
  });
  put("AMOUNT PAID", margin + 16, amountTop - 22, { size: 11, bold: true, color: rgb(1, 1, 1) });
  putRight(money(info.amount), contentRight - 16, amountTop - 34, {
    size: 20,
    bold: true,
    color: rgb(1, 1, 1),
  });

  put("Thank you for your membership.", margin, amountTop - 84, { size: 11, color: ink });
  put(
    "This is a computer generated receipt. No signature is required.",
    margin,
    96,
    { size: 9, color: muted },
  );

  return pdf.save();
}

export function receiptFilename(info: ReceiptPdfInfo): string {
  const who = safe(info.memberId).replace(/[^\w-]+/g, "") || "member";
  const month = safe(info.month).replace(/[^\w-]+/g, "");
  return `receipt-${who}-${month}-${safe(info.paymentId).replace(/[^\w-]+/g, "")}.pdf`;
}
