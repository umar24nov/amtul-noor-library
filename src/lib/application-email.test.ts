import assert from "node:assert/strict";
import test from "node:test";
import {
  sendApplicationDecisionEmail,
  sendMemberEmailChangeCodeEmail,
  sendMemberLinkCodeEmail,
} from "./application-email";

test("the member code email makes the code selectable in the message itself", async () => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.RESEND_API_KEY;
  let html = "";

  globalThis.fetch = async (_input, init) => {
    const body = JSON.parse(String(init?.body ?? "{}")) as { html?: string };
    html = body.html ?? "";
    return new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } });
  };
  process.env.RESEND_API_KEY = "test-key";

  try {
    const result = await sendMemberLinkCodeEmail({ to: "member@example.com", code: "644653" });

    assert.deepEqual(result, { ok: true });
    assert.match(html, /Your one-time sign-in code for <strong>Amtul Noor Library<\/strong> is:/);
    assert.match(html, /Tap the code below to select it, then choose Copy\./);
    assert.match(html, /user-select:all/);
    assert.match(html, /-webkit-user-select:all/);
    assert.match(html, /<strong>644653<\/strong>/);
    assert.match(html, /Enter this code to securely access your fee details and payment receipts\./);
    assert.match(html, /valid for <strong>10 minutes<\/strong> and can be used only once/);
    assert.match(html, /Please do not share this code with anyone\./);
    assert.doesNotMatch(html, /\/copy-code#/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalApiKey;
  }
});

test("the email-change code email confirms the new address and stays selectable", async () => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.RESEND_API_KEY;
  let html = "";
  let subject = "";

  globalThis.fetch = async (_input, init) => {
    const body = JSON.parse(String(init?.body ?? "{}")) as { html?: string; subject?: string };
    html = body.html ?? "";
    subject = body.subject ?? "";
    return new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } });
  };
  process.env.RESEND_API_KEY = "test-key";

  try {
    const result = await sendMemberEmailChangeCodeEmail({ to: "new@example.com", code: "123456" });

    assert.deepEqual(result, { ok: true });
    assert.match(subject, /Confirm your new Amtul Noor Library email/);
    assert.match(html, /confirm your new email for <strong>Amtul Noor Library<\/strong>/);
    assert.match(html, /Tap the code below to select it, then choose Copy\./);
    assert.match(html, /user-select:all/);
    assert.match(html, /<strong>123456<\/strong>/);
    assert.match(html, /Future sign-in codes will be sent here\./);
    assert.match(html, /valid for <strong>10 minutes<\/strong> and can be used only once/);
    assert.match(html, /Please do not share this code with anyone\./);
    assert.doesNotMatch(html, /\/copy-code#/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalApiKey;
  }
});

test("the welcome email explains how an approved member signs in", async () => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.RESEND_API_KEY;
  let html = "";

  globalThis.fetch = async (_input, init) => {
    const body = JSON.parse(String(init?.body ?? "{}")) as { html?: string };
    html = body.html ?? "";
    return new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } });
  };
  process.env.RESEND_API_KEY = "test-key";

  try {
    const approved = await sendApplicationDecisionEmail({
      to: "member@example.com",
      applicantName: "Arshad Ali",
      approved: true,
      seatLabel: "Seat 23 (with locker)",
      memberId: "ATN003",
      memberLoginUrl: "https://www.amtulnoorlibrary.in/member",
    });

    assert.deepEqual(approved, { ok: true });
    assert.match(
      html,
      /You can log in to your member page using your registered email ID and Member ID <strong>ATN003<\/strong>\./,
    );
    assert.match(html, /href="https:\/\/www\.amtulnoorlibrary\.in\/member"/);
    assert.match(html, /choose <strong>Login<\/strong>/);
    assert.match(html, /one-time code to your registered address/);

    html = "";
    const rejected = await sendApplicationDecisionEmail({
      to: "member@example.com",
      applicantName: "Arshad Ali",
      approved: false,
      reason: "Seats are full",
    });

    assert.deepEqual(rejected, { ok: true });
    assert.doesNotMatch(html, /registered email ID/);
    assert.doesNotMatch(html, /amtulnoorlibrary\.in\/member/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalApiKey;
  }
});
