import "server-only";
import { LIBRARY_EMAIL, LIBRARY_NAME } from "@/lib/constants";

/**
 * Emails a help & support message to the library. Like the receipt emailer this
 * talks to Resend over a single HTTP call, so there is no mail server to run.
 *
 * A message is always saved to the database first, so this is a courtesy
 * notification rather than the only copy: a delivery failure is logged and
 * reported, but it does not lose the message.
 */

export type SupportEmailResult = { ok: true } | { ok: false; error: string };

/** Escapes the handful of characters that matter in an HTML email body. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function supportEmailIsConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendSupportEmail(input: {
  name: string;
  email: string;
  topic: string;
  message: string;
}): Promise<SupportEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "Email is not set up yet." };
  }

  const from = process.env.RESEND_FROM ?? `${LIBRARY_NAME} <onboarding@resend.dev>`;
  const safe = {
    name: escapeHtml(input.name),
    email: escapeHtml(input.email),
    topic: escapeHtml(input.topic),
    message: escapeHtml(input.message),
  };

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
        // The message itself is the reply, so the visitor is the reply-to and
        // the owner can answer straight from their inbox.
        to: [LIBRARY_EMAIL],
        reply_to: input.email,
        subject: `${LIBRARY_NAME} — help & support: ${input.topic}`,
        html: [
          `<p><strong>${safe.topic}</strong></p>`,
          `<p>${safe.message.replace(/\n/g, "<br>")}</p>`,
          `<hr>`,
          `<p>From ${safe.name} &lt;${safe.email}&gt;</p>`,
        ].join("\n"),
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
