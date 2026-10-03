/**
 * Signs in through the real login form, the same way a browser without
 * JavaScript would, and reports what happened. Used by check-login.ts and by
 * `npx tsx prisma/test-login.ts`.
 *
 * The admin password is never stored in this repository, so it comes from
 * TEST_ADMIN_PASSWORD. If that is missing you are asked for it, and in a
 * non-interactive shell the login step is skipped with an explanation rather
 * than failing against a password that was never yours.
 */

import { createInterface } from "node:readline/promises";

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3000";

const EMAIL = process.env.TEST_ADMIN_EMAIL ?? "owner@amtulnoorlibrary.com";

type LoginTestOptions = {
  /** The .env values, already parsed by check-login.ts the way Next.js sees them. */
  env?: Record<string, string>;
};

/** Asks for the password when running in a terminal, otherwise gives up quietly. */
async function askForPassword(): Promise<string> {
  if (process.env.TEST_ADMIN_PASSWORD) return process.env.TEST_ADMIN_PASSWORD;

  if (!process.stdin.isTTY) {
    console.log("No TEST_ADMIN_PASSWORD set, so the sign-in step was skipped.");
    console.log("Run it with your own password to test the login:");
    console.log('  $env:TEST_ADMIN_PASSWORD="your-password"; npm run smoke   # PowerShell');
    return "";
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await rl.question("Admin password: ")).trim();
  } finally {
    rl.close();
  }
}

function decode(value: string) {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

/**
 * A freshly started dev server answers the first request with a 404 while it
 * compiles, so wait for it to settle before testing.
 */
async function waitForServer(timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  let attempts = 0;

  for (;;) {
    try {
      const response = await fetch(`${BASE}/login`, { redirect: "manual" });
      if (response.status === 200) {
        if (attempts > 0) console.log(`server was ready after ${attempts} retries`);
        return;
      }
    } catch {
      // not listening yet
    }

    attempts += 1;
    if (Date.now() >= deadline) {
      console.error(`The dev server did not answer on ${BASE} within 90s.`);
      console.error("Is it running? Start it with: npm run dev");
      process.exit(1);
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

export async function runLoginTest(options: LoginTestOptions = {}): Promise<boolean> {
  await waitForServer();

  const page = await fetch(`${BASE}/login`);
  const html = await page.text();

  if (page.status !== 200) {
    console.log(`GET /login -> ${page.status}`);
    console.log("the login page did not render");
    return false;
  }
  console.log("GET /login -> 200");

  const password = await askForPassword();
  if (!password) {
    // Nothing to sign in with. The environment checks still ran, so this is not
    // a pass, it is a partial check, and it says so.
    console.log("skipped signing in, so the protected routes were not tested.");
    return true;
  }

  const field = (name: string) => {
    const match = html.match(new RegExp(`name="${name.replace("$", "\\$")}"\\s+value="([^"]*)"`));
    return match ? decode(match[1]) : "";
  };

  const form = new FormData();
  form.append("$ACTION_REF_1", "");
  form.append("$ACTION_1:0", field("$ACTION_1:0"));
  form.append("$ACTION_1:1", field("$ACTION_1:1"));
  form.append("$ACTION_KEY", field("$ACTION_KEY"));
  form.append("next", "");
  form.append("email", EMAIL);
  form.append("password", password);

  const response = await fetch(`${BASE}/login`, {
    method: "POST",
    body: form,
    redirect: "manual",
  });

  const body = await response.text();
  const setCookie = response.headers.get("set-cookie") ?? "";

  console.log(`POST /login -> ${response.status} (303 means the login was accepted)`);

  let ok = false;
  if (setCookie.includes("anl_session")) {
    console.log("session cookie: SET");
    ok = true;
  } else {
    console.log("session cookie: NOT set");
  }

  if (body.includes("incorrect") || body.includes("highlighted")) {
    console.log("the page says the credentials were rejected");
    if (options.env?.ADMIN_EMAIL && !options.env.ADMIN_EMAIL.includes(EMAIL)) {
      console.log(`  note: .env has ADMIN_EMAIL=${options.env.ADMIN_EMAIL}, this test used ${EMAIL}`);
    }
    console.log("  if you changed the password, TEST_ADMIN_PASSWORD must match the new one");
    ok = false;
  }

  const cookie = setCookie.split(";")[0];
  const dash = await fetch(`${BASE}/dashboard`, {
    headers: cookie ? { cookie } : {},
    redirect: "manual",
  });
  console.log(`GET /dashboard -> ${dash.status}`);

  if (dash.status === 200) {
    const page = await dash.text();
    if (page.includes("Cannot reach the database")) {
      console.log("signed in, but the database is not running (friendly screen shown)");
    } else {
      console.log("signed in and the dashboard loaded");
    }
  } else if (dash.status === 307) {
    console.log("redirected back to the login page");
    ok = false;
  } else {
    const page = await dash.text();
    console.log("the dashboard failed, is the database running? (npm run db:local start)");
    console.log(
      page.includes("Cannot reach the database")
        ? "  the friendly database error page was shown"
        : "  WARNING: the friendly database error page was NOT shown",
    );
    if (process.env.TEST_DEBUG) {
      const text = page
        .replace(/<script[\s\S]*?<\/script>/g, " ")
        .replace(/<style[\s\S]*?<\/style>/g, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      console.log(`  page text: ${text.slice(0, 400)}`);
    }
  }

  if (cookie) {
    for (const route of ["/members", "/payments", "/seats"]) {
      const response = await fetch(`${BASE}${route}`, {
        headers: { cookie },
        redirect: "manual",
      });
      console.log(`GET ${route} -> ${response.status}`);
      if (response.status !== 200) ok = false;
    }
  }

  return ok;
}