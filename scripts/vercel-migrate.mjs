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

// Two builds can start at once (a push and a redeploy, or a preview racing
// production). Prisma serialises migrations with a Postgres advisory lock, and
// a build that cannot get the lock within 10s fails with P1002 even though the
// other build is moments from finishing. Retrying lets the loser wait its turn
// instead of failing the deployment.
const MAX_ATTEMPTS = 4;
const RETRY_DELAY_MS = 8000;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
  const result = spawnSync(binary, ["migrate", "deploy"], { stdio: "inherit" });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status === 0) {
    process.exit(0);
  }

  if (attempt < MAX_ATTEMPTS) {
    console.warn(
      `prisma migrate deploy failed (attempt ${attempt} of ${MAX_ATTEMPTS}). ` +
        `Retrying in ${RETRY_DELAY_MS / 1000}s in case another build holds the migration lock.`,
    );
    await sleep(RETRY_DELAY_MS);
  }
}

console.error("prisma migrate deploy failed; stopping the build so code cannot ship ahead of the schema.");
process.exit(1);
