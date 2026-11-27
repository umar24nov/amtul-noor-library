import assert from "node:assert/strict";
import test from "node:test";

test("receipt emails escape member-controlled fields in the HTML", async () => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.RESEND_API_KEY;
  const originalDatabaseUrl = process.env.DATABASE_URL;
  let html = "";

  globalThis.fetch = async (_input, init) => {
    const body = JSON.parse(String(init?.body ?? "{}")) as { html?: string };
    html = body.html ?? "";
    return new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } });
  };
  process.env.RESEND_API_KEY = "test-key";
  process.env.DATABASE_URL ||= "postgresql://test:test@localhost:5432/library";

  try {
    // Imported after the environment is ready: the receipt module shares the
    // normal server Prisma client. No query is made by this test.
    const { sendReceiptEmail } = await import("./receipts");
    const result = await sendReceiptEmail("member@example.com", {
      memberName: '<script>alert("x")</script> & Co',
      memberId: "ATN001",
      memberMobile: null,
      seatLabel: "Seat 1",
      paymentId: "PAY0001",
      month: "2026-03",
      amount: 700,
      mode: "Cash",
      date: new Date("2026-03-01T00:00:00.000Z"),
      remarks: null,
    });

    assert.deepEqual(result, { ok: true });
    assert.match(
      html,
      /Dear &lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt; &amp; Co,/,
    );
    assert.doesNotMatch(html, /<script>/);
    assert.match(html, /Receipt number: PAY0001/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalApiKey;
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
  }
});
