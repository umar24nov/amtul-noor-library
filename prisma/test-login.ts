/**
 * Signs in through the real login form and reports whether it worked.
 *
 *   npx tsx prisma/test-login.ts
 *
 * The dev server must already be running. You are asked for the admin password
 * unless TEST_ADMIN_PASSWORD is set.
 */
import { runLoginTest } from "./login-test";

async function main() {
  const ok = await runLoginTest();
  console.log(ok ? "\nLogin works." : "\nLogin is NOT working.");
  process.exit(ok ? 0 : 1);
}

void main();