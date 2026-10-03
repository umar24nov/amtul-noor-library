/**
 * Checks that the admin login works, without needing a browser. It loads .env the
 * same way Next.js does, including the $VAR expansion, so it cannot disagree with
 * what the app sees.
 *
 *   npm run check-login
 *
 * With the dev server running it also signs in through the real form:
 *   npm run check-login -- --live
 */
import { readFileSync } from "node:fs";

/** Minimal port of Next's .env loading: KEY=value with $VAR expansion. */
function loadEnvLikeNext(file: string) {
  const values: Record<string, string> = {};
  let text: string;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    return values;
  }
  text = text.replace(/^\uFEFF/, "");

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    const quote = value[0];
    if (quote === '"' || quote === "'") value = value.slice(1, -1);
    // $VAR is expanded, and \$ is the escape that keeps a bcrypt hash intact.
    value = value.replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, (whole) => values[whole.slice(1)] ?? "");
    value = value.replaceAll("\\$", "$");
    values[key] = value;
  }
  return values;
}

async function main() {
  const env = loadEnvLikeNext(".env");
  const live = process.argv.includes("--live");

  let failed = false;

  const hash = env.ADMIN_PASSWORD_HASH ?? "";
  const secret = env.AUTH_SECRET ?? "";
  const email = env.ADMIN_EMAIL ?? "";

  console.log(`ADMIN_EMAIL            : ${email || "(missing)"}`);
  console.log(`ADMIN_PASSWORD_HASH    : ${hash ? `${hash.length} chars` : "(missing or empty)"}`);
  console.log(`AUTH_SECRET            : ${secret.length} chars`);

  if (!email || !hash) {
    console.error("\nADMIN_EMAIL and ADMIN_PASSWORD_HASH must both be set in .env.");
    console.error("Run: npm run hash-password -- \"your-password\"");
    failed = true;
  }

  if (secret.length < 32) {
    console.error(`AUTH_SECRET must be at least 32 characters, this one is ${secret.length}.`);
    failed = true;
  }

  if (live) {
    const { runLoginTest } = await import("./login-test");
    if (!(await runLoginTest())) failed = true;
  }

  console.log(failed ? "\nSomething is not set up right." : "\nEnvironment looks correct.");
  process.exit(failed ? 1 : 0);
}

void main();