import "server-only";
import {
  LIBRARY_ADDRESS,
  LIBRARY_EMAIL,
  LIBRARY_HOURS,
  LIBRARY_HOURS_DAYS,
  LIBRARY_NAME,
  LIBRARY_PHONE,
} from "@/lib/constants";

/**
 * Emails an applicant the outcome of their membership application.
 *
 * Like the receipt and support emailers this is a single Resend HTTP call, so
 * there is no mail server to run. The decision is saved in the database first,
 * so a delivery failure is reported but never undoes the approval/rejection.
 */

export type ApplicationEmailResult = { ok: true } | { ok: false; error: string };

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function applicationEmailIsConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendApplicationDecisionEmail(input: {
  to: string;
  applicantName: string;
  approved: boolean;
  /** Room · Seat, when the member was given one. */
  seatLabel?: string | null;
  /** The owner's own words, for a rejection. */
  reason?: string | null;
}): Promise<ApplicationEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "Email is not set up yet." };

  const from = process.env.RESEND_FROM ?? `${LIBRARY_NAME} <onboarding@resend.dev>`;
  const name = escapeHtml(input.applicantName);
  const seat = input.seatLabel ? escapeHtml(input.seatLabel) : null;
  const reason = input.reason?.trim() ? escapeHtml(input.reason.trim()) : null;

  const subject = input.approved
    ? `Welcome to ${LIBRARY_NAME}`
    : `About your application to ${LIBRARY_NAME}`;

  const paragraphs = input.approved
    ? [
        `<p>Dear ${name},</p>`,
        `<p>Welcome to <strong>${LIBRARY_NAME}</strong>! Your application has been approved, and we are glad to have you with us.</p>`,
        seat
          ? `<p>Your reserved seat is <strong>${seat}</strong>. It is yours for as long as your membership continues.</p>`
          : `<p>We will assign your seat when you visit; please ask at the desk.</p>`,
        `<p>You can study with us ${LIBRARY_HOURS}, ${LIBRARY_HOURS_DAYS.toLowerCase()}. Wi-Fi and charging are included.</p>`,
        `<p>Our address: ${escapeHtml(LIBRARY_ADDRESS)}</p>`,
        `<p>If you have any questions, reply to this email or call ${LIBRARY_PHONE}.</p>`,
        `<p>We look forward to seeing you.</p>`,
        `<p>— ${LIBRARY_NAME}</p>`,
      ]
    : [
        `<p>Dear ${name},</p>`,
        `<p>Thank you for applying to <strong>${LIBRARY_NAME}</strong>. We are sorry that we cannot offer you a seat at this time.</p>`,
        reason
          ? `<p><strong>Reason:</strong> ${reason}</p>`
          : "",
        `<p>If you would like to discuss this, please contact the library manager at ${LIBRARY_PHONE} or reply to this email (${escapeHtml(LIBRARY_EMAIL)}). We will be happy to help.</p>`,
        `<p>— ${LIBRARY_NAME}</p>`,
      ];

  const html = paragraphs.filter(Boolean).join("\n");

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
        to: [input.to],
        reply_to: LIBRARY_EMAIL,
        subject,
        html,
      }),
    });
  } catch {
    return { ok: false, error: "Could not reach the email service." };
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
