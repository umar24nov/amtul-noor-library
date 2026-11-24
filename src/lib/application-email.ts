import "server-only";
import {
  LIBRARY_ADDRESS,
  LIBRARY_EMAIL,
  LIBRARY_HOURS,
  LIBRARY_NAME,
  LIBRARY_PHONE,
} from "@/lib/constants";
import { OTP_TTL_MINUTES } from "@/lib/otp-code";

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

/** Sends the one-time code used to recover a forgotten password. */
export async function sendLoginCodeEmail(input: {
  to: string;
  code: string;
}): Promise<ApplicationEmailResult> {
  const html = [
    `<p>Someone asked to sign in to ${escapeHtml(LIBRARY_NAME)} using this email address.</p>`,
    `<p>Your sign-in code is <strong style="font-size:22px;letter-spacing:4px">${escapeHtml(input.code)}</strong>.</p>`,
    `<p>It expires in ${OTP_TTL_MINUTES} minutes and can be used once. If you did not ask for it, ignore this message — your password has not changed.</p>`,
    `<p>— ${LIBRARY_NAME}</p>`,
  ].join("\n");

  return postEmail({
    to: input.to,
    subject: `Your ${LIBRARY_NAME} sign-in code`,
    html,
  });
}

/**
 * Email clients do not run JavaScript, so a one-tap copy button is not
 * reliable. The code block itself is the copy control: tap it to select the
 * whole six digits, then use the email client's Copy command. Keeping the
 * code in the message also means members never have to leave the email.
 */
function selectableCodeHtml(code: string): string {
  const safeCode = escapeHtml(code);
  return [
    `<p style="margin:14px 0 6px;font-size:13px;color:#52525b">Tap the code below to select it, then choose Copy.</p>`,
    `<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 18px">`,
    `<tr>`,
    `<td style="padding:14px 18px;border:1px solid #d4d4d8;border-radius:8px;background:#fafafa;font-size:32px;font-weight:700;letter-spacing:6px;line-height:1.2;user-select:all;-webkit-user-select:all"><strong>${safeCode}</strong></td>`,
    `</tr>`,
    `</table>`,
  ].join("\n");
}

/** Sends the one-time code that unlocks a member's permanent payment link. */
export function sendMemberLinkCodeEmail(input: {
  to: string;
  code: string;
}): Promise<ApplicationEmailResult> {
  const html = [
    `<p>Your one-time sign-in code for <strong>${escapeHtml(LIBRARY_NAME)}</strong> is:</p>`,
    selectableCodeHtml(input.code),
    `<p>Enter this code to securely access your fee details and payment receipts.</p>`,
    `<p>This code is valid for <strong>${OTP_TTL_MINUTES} minutes</strong> and can be used only once.</p>`,
    `<p><strong>Please do not share this code with anyone.</strong></p>`,
  ].join("\n");

  return postEmail({
    to: input.to,
    subject: `Your ${LIBRARY_NAME} sign-in code`,
    html,
  });
}

/** Sends the code that confirms a member's new email address. */
export function sendMemberEmailChangeCodeEmail(input: {
  to: string;
  code: string;
}): Promise<ApplicationEmailResult> {
  const html = [
    `<p>Your one-time code to confirm your new email for <strong>${escapeHtml(LIBRARY_NAME)}</strong> is:</p>`,
    selectableCodeHtml(input.code),
    `<p>Enter this code on your member page to confirm this email address. Future sign-in codes will be sent here.</p>`,
    `<p>This code is valid for <strong>${OTP_TTL_MINUTES} minutes</strong> and can be used only once.</p>`,
    `<p><strong>Please do not share this code with anyone.</strong></p>`,
  ].join("\n");

  return postEmail({
    to: input.to,
    subject: `Confirm your new ${LIBRARY_NAME} email`,
    html,
  });
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
  /** Seat number, when the member was given one. */
  seatLabel?: string | null;
  /** The ID the member uses at the sign-in screen. */
  memberId?: string | null;
  /** Absolute link to the public member sign-in page. */
  memberLoginUrl?: string | null;
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
        input.memberId
          ? `<p>You can log in to your member page using your registered email ID and Member ID <strong>${escapeHtml(input.memberId)}</strong>.</p>`
          : `<p>You can log in to your member page using your registered email ID.</p>`,
        input.memberLoginUrl
          ? `<p>Visit <a href="${escapeHtml(input.memberLoginUrl)}">${escapeHtml(input.memberLoginUrl)}</a> and choose <strong>Member login</strong>. We&apos;ll email a one-time code to your registered address.</p>`
          : `<p>Open the member login page on our website and choose <strong>Member login</strong>. We&apos;ll email a one-time code to your registered address.</p>`,
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
