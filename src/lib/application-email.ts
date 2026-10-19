import "server-only";
import {
  LIBRARY_ADDRESS,
  LIBRARY_EMAIL,
  LIBRARY_HOURS,
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

/** Single low-level Resend call shared by every message this module sends. */
async function postEmail(payload: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<ApplicationEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "Email is not set up yet." };

  const from = process.env.RESEND_FROM ?? `${LIBRARY_NAME} <onboarding@resend.dev>`;

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
        to: [payload.to],
        reply_to: payload.replyTo ?? LIBRARY_EMAIL,
        subject: payload.subject,
        html: payload.html,
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

/**
 * Tells the library inbox that a new application has arrived, with everything
 * the owner needs to decide. Replies go straight back to the applicant.
 */
export async function sendNewApplicationNotice(input: {
  name: string;
  mobile: string;
  email: string | null;
  address: string | null;
  guardianName: string | null;
  guardianMobile: string | null;
  aadhaarNumber: string;
  preparingFor: string;
  desiredJoiningDate: string;
  seatLabel: string | null;
  adminUrl: string;
}): Promise<ApplicationEmailResult> {
  const guardian = input.guardianName
    ? input.guardianMobile
      ? `${input.guardianName} (${input.guardianMobile})`
      : input.guardianName
    : input.guardianMobile;

  const rows: [string, string | null][] = [
    ["Name", input.name],
    ["Mobile", input.mobile],
    ["Email", input.email],
    ["Guardian", guardian],
    ["Aadhaar", input.aadhaarNumber],
    ["Preparing for", input.preparingFor],
    ["Wants to join", input.desiredJoiningDate],
    ["Requested seat", input.seatLabel],
    ["Address", input.address],
  ];

  const rowsHtml = rows
    .filter(([, value]) => Boolean(value))
    .map(
      ([label, value]) =>
        `<tr><td style="padding:3px 14px 3px 0;color:#666">${escapeHtml(
          label,
        )}</td><td style="padding:3px 0"><strong>${escapeHtml(String(value))}</strong></td></tr>`,
    )
    .join("\n");

  const html = [
    `<p>A new membership application has come in through the website.</p>`,
    `<table style="border-collapse:collapse;font-size:14px">${rowsHtml}</table>`,
    `<p><a href="${escapeHtml(input.adminUrl)}">Open the applications page</a> to review it.</p>`,
    `<p>— ${LIBRARY_NAME}</p>`,
  ].join("\n");

  return postEmail({
    to: LIBRARY_EMAIL,
    subject: `New application — ${input.name}`,
    html,
    replyTo: input.email ?? undefined,
  });
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
  const name = escapeHtml(input.applicantName);
  const seat = input.seatLabel ? escapeHtml(input.seatLabel) : null;
  const reason = input.reason?.trim() ? escapeHtml(input.reason.trim()) : null;

  const subject = input.approved
    ? `Welcome to ${LIBRARY_NAME}`
    : `About your application to ${LIBRARY_NAME}`;

  const paragraphs = input.approved
    ? [
        `<p>Dear ${name},</p>`,
        `<p>Welcome to <strong>${LIBRARY_NAME}</strong> — we&apos;re glad to have you with us.</p>`,
        seat
          ? `<p>Your seat is reserved: <strong>${seat}</strong>.</p>`
          : `<p>We&apos;ll assign your seat when you visit; please ask at the desk.</p>`,
        `<p>We&apos;re open ${LIBRARY_HOURS}.</p>`,
        `<p>Our address: ${escapeHtml(LIBRARY_ADDRESS)}</p>`,
        `<p>If you have any questions, reply to this email or call ${LIBRARY_PHONE}. We look forward to seeing you.</p>`,
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

  return postEmail({
    to: input.to,
    subject,
    html: paragraphs.filter(Boolean).join("\n"),
  });
}
