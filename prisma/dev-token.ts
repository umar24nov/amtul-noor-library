/**
 * Prints a session cookie value for the local development admin, so pages can
 * be smoke tested with curl:
 *
 *   npx tsx prisma/dev-token.ts
 *
 * Pass an email and/or level to mint a token for a different account, which is
 * how the day-to-day screens are checked. `--role=STAFF` is kept as an alias for
 * `--level=DAY_TO_DAY` so older notes still work:
 *
 *   npx tsx prisma/dev-token.ts --level=DAY_TO_DAY --email=staff@example.com
 *   npx tsx prisma/dev-token.ts --role=STAFF --email=staff@example.com
 *   npx tsx prisma/dev-token.ts --level=DAY_TO_DAY --roleId=2 --userId=3
 *
 * Development only. It signs with AUTH_SECRET exactly like src/lib/auth.ts.
 */
import "dotenv/config";
import { SignJWT } from "jose";
import type { RoleLevel } from "../src/generated/prisma/enums";

function argValue(flag: string): string | undefined {
  const prefix = `--${flag}=`;
  const match = process.argv.find((value) => value.startsWith(prefix));
  return match ? match.slice(prefix.length) : undefined;
}

function levelFromArgs(): RoleLevel {
  const raw = (argValue("level") ?? argValue("role") ?? "ADMIN").toUpperCase();
  return raw === "DAY_TO_DAY" || raw === "STAFF" ? "DAY_TO_DAY" : "ADMIN";
}

async function main() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set.");

  const email = argValue("email") ?? process.env.ADMIN_EMAIL ?? "admin@amtulnoorlibrary.com";
  const level = levelFromArgs();
  const roleId = Number(argValue("roleId") ?? 0);
  const userId = Number(argValue("userId") ?? 0);

  const token = await new SignJWT({ email, userId, roleId, level })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(new TextEncoder().encode(secret));

  console.log(token);
}

void main();
