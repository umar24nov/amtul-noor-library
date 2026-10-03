/**
 * Development-only PostgreSQL that runs from node_modules, so the project can be
 * developed without installing Postgres or Docker on the machine.
 *
 *   npm run db:local start   # initialise (once), start, and keep it running
 *   npm run db:local stop    # shut it down
 *
 * Data is stored in .local-db/ and survives restarts. It is gitignored and must
 * never be pointed at a production database.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import "dotenv/config";
import EmbeddedPostgres from "embedded-postgres";

const PORT = Number(process.env.LOCAL_DB_PORT ?? 54329);
const USER = "postgres";
const PASSWORD = "postgres";
const DATABASE = "amtul_noor_library";
const DATABASE_DIR = path.join(process.cwd(), ".local-db");

const pg = new EmbeddedPostgres({
  databaseDir: DATABASE_DIR,
  port: PORT,
  user: USER,
  password: PASSWORD,
  persistent: true,
  onLog: () => {},
  onError: (error) => console.error("[postgres]", error),
});

async function main() {
  const command = process.argv[2] ?? "start";

  if (command === "stop") {
    await pg.stop();
    if (await waitForPortToClose(3_000)) {
      console.log("Local PostgreSQL stopped.");
      return;
    }

    // pg.stop() only knows about a cluster it started itself, so stopping from a
    // second terminal needs pg_ctl. A clean shutdown matters: killing Postgres
    // outright can leave the write ahead log in a state that needs recovery.
    if (await stopWithPgCtl()) {
      console.log("Local PostgreSQL stopped.");
      return;
    }

    const killed = forceStopListener();
    console.log(
      killed
        ? "Local PostgreSQL stopped (it ignored a clean shutdown and had to be ended directly)."
        : "Local PostgreSQL stopped, but something is still listening on the port.",
    );
    return;
  }

  if (command !== "start") {
    throw new Error(`Unknown command "${command}". Use "start" or "stop".`);
  }

  if (await isAlreadyListening()) {
    console.log(`Local PostgreSQL is already running on port ${PORT}.`);
    console.log(`DATABASE_URL="${connectionString()}"`);
    console.log("Nothing to do. Close the other terminal, or run: npm run db:local stop");
    return;
  }

  const firstRun = !existsSync(path.join(DATABASE_DIR, "PG_VERSION"));
  if (firstRun) {
    console.log("First run: initialising the database cluster, this takes a moment.");
    await pg.initialise();
  }
  await pg.start();
  if (firstRun) await pg.createDatabase(DATABASE);

  console.log(`Local PostgreSQL is running on port ${PORT}.`);
  console.log(`DATABASE_URL="${connectionString()}"`);
  console.log("Press Ctrl+C to stop it.");

  // The cluster is a separate process, so keep this one alive to hold the terminal.
  await new Promise(() => {});
}

function connectionString() {
  return `postgresql://${USER}:${PASSWORD}@localhost:${PORT}/${DATABASE}?sslmode=disable`;
}

/** True when something is already listening on the port, so we can say so plainly. */
async function isAlreadyListening() {
  return (await portOwner()) !== null;
}

/** The process listening on the local database port, or null when the port is free. */
function portOwner(): number | null {
  try {
    const output = execFileSync("netstat", ["-ano", "-p", "tcp"], { encoding: "utf8" });
    const line = output
      .split(/\r?\n/)
      .find((row) => row.includes(`:${PORT}`) && row.includes("LISTENING"));
    if (!line) return null;
    const pid = Number(line.trim().split(/\s+/).at(-1));
    return Number.isInteger(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

/** Asks the cluster to shut down cleanly and waits for the port to be released. */
async function stopWithPgCtl() {
  if (process.platform !== "win32") return false;
  const pgCtl = findPgCtl();
  if (!pgCtl) return false;

  try {
    execFileSync(pgCtl, ["stop", "-D", DATABASE_DIR, "-m", "fast", "-w", "-t", "30"], {
      stdio: "ignore",
    });
  } catch {
    // fall through, the caller force stops the listener
  }
  return waitForPortToClose(15_000);
}

/** The pg_ctl that ships with the embedded PostgreSQL binaries, if it can be found. */
function findPgCtl(): string | null {
  const root = path.join(process.cwd(), "node_modules", "@embedded-postgres");
  if (!existsSync(root)) return null;

  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const candidate = path.join(root, entry.name, "native", "bin", "pg_ctl.exe");
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

async function waitForPortToClose(timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (portOwner() === null) return true;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return portOwner() === null;
}

function forceStopListener() {
  const pid = portOwner();
  if (pid === null) return false;
  try {
    process.kill(pid, "SIGKILL");
    return true;
  } catch {
    return false;
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\nCould not start the local database.\n${message}\n`);
  console.error(`If port ${PORT} is taken by another program, either stop that program or set`);
  console.error("LOCAL_DB_PORT in .env to a free port and update DATABASE_URL to match.");
  process.exit(1);
});