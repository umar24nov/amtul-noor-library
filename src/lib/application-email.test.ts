import assert from "node:assert/strict";
import test from "node:test";
import { sendMemberLinkCodeEmail } from "./application-email";

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
