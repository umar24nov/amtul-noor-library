/**
 * Shared vocabulary for the member activity monitor.
 *
 * Every member event is written to MemberAuditLog, the same table that already
 * records staff changes to a member. Keeping the action names and the display
 * labels here means a new event can be added in one place and then wired into a
 * server action; the monitor page does not need to know where it came from.
 *
 * This module is deliberately free of Next.js and database imports so the
 * formatting and safety rules can be tested directly.
 */

export const MEMBER_AUDIT_ACTIONS = {
  MEMBER_CREATED: "MEMBER_CREATED",
  MEMBER_UPDATED: "MEMBER_UPDATED",
  MEMBER_MARKED_LEFT: "MEMBER_MARKED_LEFT",
  MEMBER_REJOINED: "MEMBER_REJOINED",
  MEMBER_DELETED: "MEMBER_DELETED",
  SEAT_ASSIGNED: "SEAT_ASSIGNED",
  SEAT_CHANGED: "SEAT_CHANGED",
  SEAT_RELEASED: "SEAT_RELEASED",
  PAYMENT_RECORDED: "PAYMENT_RECORDED",
  PAYMENT_EDITED: "PAYMENT_EDITED",
  PAYMENT_DELETED: "PAYMENT_DELETED",
  FEE_CHANGED: "FEE_CHANGED",
  MEMBER_SELF_UPDATED: "MEMBER_SELF_UPDATED",
  EMAIL_CHANGED: "EMAIL_CHANGED",
  MEMBER_SIGNED_IN: "MEMBER_SIGNED_IN",
  MEMBER_SIGNED_OUT: "MEMBER_SIGNED_OUT",
  MEMBER_CODE_REQUESTED: "MEMBER_CODE_REQUESTED",
  MEMBER_OTP_FAILED: "MEMBER_OTP_FAILED",
  RECEIPT_DOWNLOADED: "RECEIPT_DOWNLOADED",
  RECEIPT_EMAILED: "RECEIPT_EMAILED",
} as const;

export type MemberAuditAction = (typeof MEMBER_AUDIT_ACTIONS)[keyof typeof MEMBER_AUDIT_ACTIONS];

/** Member events are kept for a year, then removed by the writer itself. */
export const MEMBER_ACTIVITY_RETENTION_DAYS = 365;

export function memberActivityCutoff(now: Date = new Date()): Date {
  return new Date(now.getTime() - MEMBER_ACTIVITY_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

export const MEMBER_ACTIVITY_LABELS: Record<MemberAuditAction, string> = {
  MEMBER_CREATED: "Member added",
  MEMBER_UPDATED: "Member details changed",
  MEMBER_MARKED_LEFT: "Marked as left",
  MEMBER_REJOINED: "Rejoined",
  MEMBER_DELETED: "Member deleted",
  SEAT_ASSIGNED: "Seat assigned",
  SEAT_CHANGED: "Seat changed",
  SEAT_RELEASED: "Seat released",
  PAYMENT_RECORDED: "Payment recorded",
  PAYMENT_EDITED: "Payment edited",
  PAYMENT_DELETED: "Payment deleted",
  FEE_CHANGED: "Monthly fee changed",
  MEMBER_SELF_UPDATED: "Member updated own details",
  EMAIL_CHANGED: "Email changed",
  MEMBER_SIGNED_IN: "Signed in",
  MEMBER_SIGNED_OUT: "Signed out",
  MEMBER_CODE_REQUESTED: "Access code sent",
  MEMBER_OTP_FAILED: "Incorrect access code",
  RECEIPT_DOWNLOADED: "Receipt downloaded",
  RECEIPT_EMAILED: "Receipt emailed",
};

export const MEMBER_ACTIVITY_ACTION_OPTIONS = Object.values(MEMBER_AUDIT_ACTIONS).map((action) => ({
  value: action,
  label: MEMBER_ACTIVITY_LABELS[action],
}));

const ACTION_VALUES: ReadonlySet<string> = new Set(Object.values(MEMBER_AUDIT_ACTIONS));

export function isMemberActivityAction(value: string): value is MemberAuditAction {
  return ACTION_VALUES.has(value);
}

/** Keys that must never reach an audit row, whatever the caller passes in. */
const SENSITIVE_KEY_FRAGMENTS = [
  "code",
  "otp",
  "token",
  "secret",
  "password",
  "aadhaar",
  "cookie",
  "authorization",
  "signature",
];

const MAX_KEY_COUNT = 16;
const MAX_STRING_LENGTH = 200;
const MAX_ARRAY_LENGTH = 20;
const MAX_DEPTH = 3;
const MAX_METADATA_JSON_LENGTH = 4_000;
const REDACTED = "[redacted]";

/** Shape-only checks, so a future caller cannot persist a secret by mistake. */
const TOKEN_SHAPED = /^[a-f0-9]{20,128}$/i;
const OTP_SHAPED = /^\d{6}$/;
const AADHAAR_SHAPED = /^\d{12}$/;

function looksSensitive(key: string): boolean {
  const lower = key.toLowerCase();
  return SENSITIVE_KEY_FRAGMENTS.some((fragment) => lower.includes(fragment));
}

function redactSensitiveValue(value: string): string {
  const trimmed = value.trim();
  if (
    TOKEN_SHAPED.test(trimmed) ||
    OTP_SHAPED.test(trimmed) ||
    AADHAAR_SHAPED.test(trimmed) ||
    /(?:aadhaar|aadhar)[\s:=-]*\d/i.test(trimmed)
  ) {
    return REDACTED;
  }
  return value;
}

function sanitizeValue(value: unknown, depth: number): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") {
    const safe = redactSensitiveValue(value);
    return safe.length > MAX_STRING_LENGTH ? `${safe.slice(0, MAX_STRING_LENGTH)}…` : safe;
  }
  if (depth >= MAX_DEPTH) return "[nested]";
  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY_LENGTH).map((item) => sanitizeValue(item, depth + 1));
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value).slice(0, MAX_KEY_COUNT)) {
      if (!looksSensitive(key)) out[key] = sanitizeValue(item, depth + 1);
    }
    return out;
  }
  return null;
}

/**
 * Removes codes, tokens, secrets and ID data from extra context before it is
 * persisted. The writer adds a short user-agent separately; callers never need
 * to pass one.
 */
export function sanitizeActivityMetadata(
  metadata: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;

  const clean = sanitizeValue(metadata, 0);
  if (!clean || typeof clean !== "object" || Array.isArray(clean)) return null;

  const json = JSON.stringify(clean);
  if (json.length > MAX_METADATA_JSON_LENGTH) {
    return { truncated: true, reason: "context-too-large" };
  }
  return clean as Record<string, unknown>;
}

/**
 * Reduces a raw browser header to a short, human-readable device description.
 * Version numbers and engine noise are dropped; no full header is persisted.
 */
export function describeUserAgent(value: string | null | undefined): string {
  if (!value) return "";
  const parts = value
    .split(/[;()]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .filter(
      (part) =>
        !/^(?:mozilla\/[\d.]+|compatible|like\s+gecko|msie|trident|rv:|applewebkit|webkit|version)/i.test(
          part,
        ),
    )
    .filter((part) => !/^\d[\d.]*$/.test(part))
    .slice(0, 5);
  const summary = parts.join(" / ");
  return summary.length > MAX_STRING_LENGTH ? `${summary.slice(0, MAX_STRING_LENGTH)}…` : summary;
}

export type ActivityChangeView = { label: string; old: string; new: string };

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string") return redactSensitiveValue(value);
  try {
    const json = JSON.stringify(value);
    const text = json ?? String(value);
    return text.length > MAX_STRING_LENGTH ? `${text.slice(0, MAX_STRING_LENGTH)}…` : text;
  } catch {
    return "[unreadable]";
  }
}

/** Turns stored field diffs into display rows, ignoring damaged JSON. */
export function formatActivityChanges(changes: unknown): ActivityChangeView[] {
  if (!Array.isArray(changes)) return [];
  return changes.slice(0, 10).flatMap((change) => {
    if (!change || typeof change !== "object" || Array.isArray(change)) return [];
    const row = change as Record<string, unknown>;
    return [
      {
        label: formatValue(row.label || row.field || "Field"),
        old: formatValue(row.old),
        new: formatValue(row.new),
      },
    ];
  });
}

const METADATA_SUMMARY_FIELDS: Array<[string, string]> = [
  ["channel", "Via"],
  ["purpose", "Purpose"],
  ["month", "Month"],
  ["paymentId", "Payment"],
  ["maskedEmail", "Sent to"],
  ["reason", "Result"],
  ["device", "Device"],
];

/** A compact plain-language line for the context that is safe to display. */
export function summarizeActivityMetadata(metadata: unknown): string[] {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return [];
  const row = metadata as Record<string, unknown>;
  return METADATA_SUMMARY_FIELDS.flatMap(([key, label]) => {
    const value = row[key];
    if (value === null || value === undefined || value === "") return [];
    return [`${label}: ${formatValue(value)}`];
  });
}
