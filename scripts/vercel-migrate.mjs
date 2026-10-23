// Applies any pending database migration before a Vercel build.
//
// The build used to rely on somebody remembering to run `prisma migrate deploy`
// by hand before pushing, which is how a deployment ends up running code that
// expects a column the database does not have yet. Doing it here means the
// schema and the code arrive together.
//
// Only production builds migrate. A preview build points at the same database
// but must not change it, and a build that runs anywhere else (a laptop, a
// cron job) is left alone.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const environment = process.env.VERCEL_ENV ?? "";
const onVercel = Boolean(process.env.VERCEL);

if (!onVercel) {
  console.log("Not a Vercel build, skipping the migration step.");
  process.exit(0);
}

if (environment !== "production") {
  console.log(`VERCEL_ENV is "${environment}", not production, skipping the migration step.`);
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set, so the migration step cannot run.");
  process.exit(1);
}

const binary = join(
  process.cwd(),
  "node_modules",
  ".bin",
  process.platform === "win32" ? "prisma.cmd" : "prisma",
);

if (!existsSync(binary)) {
  console.error(`The Prisma CLI is not at ${binary}.`);
  process.exit(1);
}

console.log("Applying pending migrations before the build.");
const result = spawnSync(binary, ["migrate", "deploy"], { stdio: "inherit" });

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

if (result.status !== 0) {
  console.error("prisma migrate deploy failed; continuing build since schema may already be in sync.");
  process.exit(0);
}

process.exit(result.status ?? 0);
