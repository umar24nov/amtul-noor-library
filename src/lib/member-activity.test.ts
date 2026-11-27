import test from "node:test";
import assert from "node:assert/strict";
import {
  describeUserAgent,
  formatActivityChanges,
  isMemberActivityAction,
  MEMBER_ACTIVITY_RETENTION_DAYS,
  memberActivityCutoff,
  sanitizeActivityChanges,
  sanitizeActivityMetadata,
  sanitizeActivityText,
  summarizeActivityMetadata,
} from "./member-activity";

test("sensitive keys are removed before an event is stored", () => {
  const clean = sanitizeActivityMetadata({
    channel: "Portal",
    code: "123456",
    otpCode: "123456",
    payToken: "bef6f0ec8d7a9e04afc671ac69dc9e9fa975",
    sessionCookie: "jwt-value",
    adminPassword: "secret",
    aadhaarNumber: "123456789012",
    maskedEmail: "u***@example.com",
  });

  assert.deepEqual(clean, {
    channel: "Portal",
    maskedEmail: "u***@example.com",
  });
});

test("secret-shaped values are redacted even under an innocent key", () => {
  const clean = sanitizeActivityMetadata({
    note: "123456",
    reference: "bef6f0ec8d7a9e04afc671ac69dc9e9fa975",
    identity: "123456789012",
    month: "2026-11",
  });

  assert.deepEqual(clean, {
    note: "[redacted]",
    reference: "[redacted]",
    identity: "[redacted]",
    month: "2026-11",
  });
});

test("a long value is truncated rather than stored in full", () => {
  const clean = sanitizeActivityMetadata({ note: "a".repeat(8_000) });
  assert.equal(clean?.note, `${"a".repeat(200)}…`);
});

test("oversized context is replaced with a short marker", () => {
  const clean = sanitizeActivityMetadata({
    items: Array.from({ length: 20 }, () => "a".repeat(200)),
  });
  assert.deepEqual(clean, { truncated: true, reason: "context-too-large" });
});

test("a browser header is reduced to a readable device summary", () => {
  const agent =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
  assert.match(describeUserAgent(agent), /Windows NT 10\.0/);
  assert.match(describeUserAgent(agent), /Chrome/);
  assert.doesNotMatch(describeUserAgent(agent), /AppleWebKit/);
  assert.equal(describeUserAgent(null), "");
});

test("retention is exactly twelve months", () => {
  const now = new Date("2026-11-27T12:00:00.000Z");
  const cutoff = memberActivityCutoff(now);
  assert.equal(MEMBER_ACTIVITY_RETENTION_DAYS, 365);
  assert.equal(cutoff.toISOString(), "2025-11-27T12:00:00.000Z");
});

test("field diffs render safely and ignore damaged rows", () => {
  const changes = formatActivityChanges([
    { field: "mobile", label: "Mobile", old: "9876543210", new: "9123456789" },
    null,
    "broken",
    { label: "Email", old: "a@example.com", new: "b@example.com" },
  ]);

  assert.deepEqual(changes, [
    { label: "Mobile", old: "9876543210", new: "9123456789" },
    { label: "Email", old: "a@example.com", new: "b@example.com" },
  ]);
  assert.deepEqual(formatActivityChanges({ not: "an array" }), []);
});

test("only approved context fields are summarised for display", () => {
  const lines = summarizeActivityMetadata({
    channel: "Pay link",
    purpose: "ACCESS",
    month: "2026-11",
    paymentId: 42,
    maskedEmail: "u***@example.com",
    device: "Windows NT 10.0 / Chrome",
    code: "123456",
  });

  assert.deepEqual(lines, [
    "Via: Pay link",
    "Purpose: ACCESS",
    "Month: 2026-11",
    "Payment: 42",
    "Sent to: u***@example.com",
    "Device: Windows NT 10.0 / Chrome",
  ]);
});

test("action names are validated against the shared vocabulary", () => {
  assert.equal(isMemberActivityAction("MEMBER_SIGNED_IN"), true);
  assert.equal(isMemberActivityAction("MEMBER_OTP_FAILED"), true);
  assert.equal(isMemberActivityAction("DROP_TABLE"), false);
});

test("free text summaries remove embedded secrets before storage", () => {
  assert.equal(
    sanitizeActivityText("Code bef6f0ec8d7a9e04afc671ac69dc9e9fa975 sent for OTP: 123456"),
    "Code [redacted] sent for [redacted]",
  );
  assert.equal(sanitizeActivityText("Password: hunter2"), "[redacted]");
  assert.equal(sanitizeActivityText("a".repeat(500)), `${"a".repeat(200)}…`);
});

test("metadata redacts secrets embedded in innocent-looking text", () => {
  const clean = sanitizeActivityMetadata({
    note: "Token bef6f0ec8d7a9e04afc671ac69dc9e9fa975 and verification code 654321",
    detail: "session cookie abcdefghijklmnop",
  });

  assert.deepEqual(clean, {
    note: "Token [redacted] and [redacted]",
    detail: "[redacted]",
  });
});

test("field diffs are sanitised, capped and ignore damaged rows", () => {
  const changes = [
    { field: "mobile", label: "Mobile", old: "9876543210", new: "9123456789" },
    {
      field: "identity",
      label: "Identity",
      old: "123456789012",
      new: "session token abcdefghijkl",
    },
    null,
    "broken",
  ] as unknown as Parameters<typeof sanitizeActivityChanges>[0];

  assert.deepEqual(sanitizeActivityChanges(changes), [
    { field: "mobile", label: "Mobile", old: "9876543210", new: "9123456789" },
    { field: "identity", label: "Identity", old: "[redacted]", new: "[redacted]" },
  ]);
  assert.equal(
    sanitizeActivityChanges(
      Array.from({ length: 25 }, (_, index) => ({
        field: `field${index}`,
        label: `Field ${index}`,
        old: "a",
        new: "b",
      })),
    )?.length,
    20,
  );
  assert.equal(sanitizeActivityChanges([]), undefined);
  assert.equal(sanitizeActivityChanges(null), undefined);
});

test("stored field diffs are redacted when rendered", () => {
  const changes = formatActivityChanges([
    { label: "Mobile", old: "9876543210", new: "123456" },
    { label: "Reference", old: "bef6f0ec8d7a9e04afc671ac69dc9e9fa975", new: "paid" },
  ]);

  assert.deepEqual(changes, [
    { label: "Mobile", old: "9876543210", new: "[redacted]" },
    { label: "Reference", old: "[redacted]", new: "paid" },
  ]);
});
