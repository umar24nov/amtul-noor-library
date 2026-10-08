import {
  LIBRARY_NAME,
  LIBRARY_PHONE,
} from "@/lib/constants";
import { formatINR, formatDate, formatMonth } from "@/lib/format";

/**
 * WhatsApp links built from a message.
 *
 * These are deliberately importable from client components: they only build
 * `wa.me` URLs, so nothing here touches the database or the server.
 */

/** A chat with the library's own number, message already typed in. */
export function whatsappChatUrl(message: string): string {
  return `https://wa.me/91${LIBRARY_PHONE}?text=${encodeURIComponent(message)}`;
}

/** A `wa.me` share that lets the reader pick any contact to forward to. */
export function whatsappShareUrl(pageTitle: string, href: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${pageTitle} — ${href}`)}`;
}

export type ReminderInfo = {
  name: string;
  due: number;
  month: string;
};

/** The message asking one member for a month they have not paid yet. */
export function paymentReminderMessage(info: ReminderInfo): string {
  return [
    `Hi ${info.name},`,
    ``,
    `This is ${LIBRARY_NAME}. Your fee of ${formatINR(info.due)} for ${formatMonth(
      info.month,
    )} is still due.`,
    `You can pay by visiting us during opening hours or on WhatsApp.`,
    ``,
    `Thank you.`,
  ].join("\n");
}

/** A chat with the member asking for their pending fee. */
export function paymentReminderUrl(
  mobile: string | null | undefined,
  info: ReminderInfo,
): string | null {
  const digits = mobile?.replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/91${digits}?text=${encodeURIComponent(paymentReminderMessage(info))}`;
}

export type ReceiptInfo = {
  name: string;
  memberId: string;
  paymentId: string;
  month: string;
  amount: number;
  mode: string;
  date: Date;
};

/** A ready receipt for one paid month, sent to the member on WhatsApp. */
export function paymentReceiptMessage(info: ReceiptInfo): string {
  return [
    `${LIBRARY_NAME} — payment receipt`,
    ``,
    `Member: ${info.name} (${info.memberId})`,
    `Payment ID: ${info.paymentId}`,
    `Month: ${formatMonth(info.month)}`,
    `Amount: ${formatINR(info.amount)}`,
    `Mode: ${info.mode}`,
    `Date: ${formatDate(info.date)}`,
    ``,
    `Thank you for your membership.`,
  ].join("\n");
}

/** A chat with the member carrying their payment receipt. */
export function paymentReceiptUrl(
  mobile: string | null | undefined,
  info: ReceiptInfo,
): string | null {
  const digits = mobile?.replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/91${digits}?text=${encodeURIComponent(paymentReceiptMessage(info))}`;
}