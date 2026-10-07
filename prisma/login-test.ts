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

  // The landing page is public, so a signed out visitor must be able to read it.
  // This catches someone removing the one `pathname === "/"` exception from
  // src/proxy.ts, which otherwise fails silently by bouncing every visitor to
  // the login page.
  const landing = await fetch(`${BASE}/`, { redirect: "manual" });
  const landingBody = await landing.text();
  console.log(`GET / (signed out) -> ${landing.status}`);

  if (landing.status !== 200) {
    console.log("the landing page is not public, a signed out visitor cannot see it");
    return false;
  }
  if (landingBody.includes("Sign in to manage the library")) {
    console.log("WARNING: / rendered the login page, so the proxy is still redirecting it");
  }
  // Two ways in, in plain words: the Login button in the header and the Sign in
  // link in the footer. Both are labelled for what they are — the page is
  // public, and neither is a reason to tell a stranger that this is a
  // single-owner business.
  const loginLinks = [...landingBody.matchAll(/href="\/login"/g)].length;
  console.log(`login links on / -> ${loginLinks}`);
  if (loginLinks !== 2) {
    console.log(`expected two login links (header + footer) on the landing page, found ${loginLinks}`);
    return false;
  }

  // The reviews page is a public page too, reached from the header nav. A
  // signed out visitor must be able to read it rather than being bounced to
  // the login page.
  const reviews = await fetch(`${BASE}/reviews`, { redirect: "manual" });
  console.log(`GET /reviews (signed out) -> ${reviews.status}`);
  if (reviews.status !== 200) {
    console.log("the reviews page is not public, a signed out visitor cannot see it");
    return false;
  }
  const reviewsBody = await reviews.text();
  if (!reviewsBody.includes("Reviews members left on Google")) {
    console.log("the reviews page header is missing from /reviews");
    return false;
  }
  if (!/href="\/login"[^>]*>Login</.test(landingBody)) {
    console.log("the header login link is not labelled 'Login'");
    return false;
  }
  if (landingBody.includes("Owner login")) {
    console.log("WARNING: an 'Owner login' label is still on the landing page");
  }
  if (landingBody.includes("Knowledge and Focus")) {
    console.log("WARNING: an old tagline is still on the landing page");
  }

  // Placeholder details from an early draft of the page. None of these are
  // true of the library, so none of them should ever reach the public page.
  for (const fiction of [
    "Central Academic Enclave",
    "+91 98765 43210",
    "300 Mbps",
    "dB (Quiet Zone)",
    "14 Seats Open",
    "50 Desks",
  ]) {
    if (landingBody.includes(fiction)) {
      console.log(`WARNING: placeholder text is still on the landing page: "${fiction}"`);
      return false;
    }
  }

  // The published prices and the one number that reaches people by tapping.
  if (!landingBody.includes("700") || !landingBody.includes("800")) {
    console.log("the published fees are missing from the landing page");
    return false;
  }
  if (!landingBody.includes("wa.me/918273306126")) {
    console.log("the WhatsApp link on the landing page is missing or wrong");
    return false;
  }
  // Only the main number is answered on WhatsApp, so it must be the only one
  // behind a wa.me link. The second number is still published, as a tel: link.
  if (!landingBody.includes("tel:+919389632856")) {
    console.log("the second phone number is missing from the landing page");
    return false;
  }
  if (landingBody.includes("wa.me/919389632856")) {
    console.log("WARNING: a WhatsApp link points at the second number, which is not answered there");
    return false;
  }
  if (landingBody.includes("7:00 AM – 12:00 PM") === false) {
    console.log("the opening hours on the landing page are missing");
    return false;
  }
  // Exactly four photographs: one hero and three in the gallery.
  const galleryImages = [...landingBody.matchAll(/\/images\/[a-z0-9-]+\.jpg/g)].map((m) => m[0]);
  const distinct = new Set(galleryImages);
  console.log(`landing page images -> ${[...distinct].join(", ")}`);
  if (distinct.size !== 4) {
    console.log(`expected four photographs on the landing page, found ${distinct.size}`);
    return false;
  }

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

    // Signed in, the landing page stays available: the library name in the
    // dashboard links back to it, so it must render rather than bounce away.
    const signedInLanding = await fetch(`${BASE}/`, {
      headers: { cookie },
      redirect: "manual",
    });
    console.log(`GET / (signed in) -> ${signedInLanding.status}`);
    if (signedInLanding.status !== 200) {
      console.log("a signed in visitor could not see the landing page from /");
      ok = false;
    }
  }

  return ok;
}