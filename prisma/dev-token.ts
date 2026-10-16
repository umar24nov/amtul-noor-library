/**
 * Prints a session cookie value for the local development admin, so pages can
 * be smoke tested with curl:
 *
 *   npx tsx prisma/dev-token.ts
 *
 * Pass an email and/or role to mint a token for a different account, which is
 * how the staff-only screens are checked:
 *
 *   npx tsx prisma/dev-token.ts --role=STAFF --email=staff@example.com
 *
 * Development only. It signs with AUTH_SECRET exactly like src/lib/auth.ts.
 */
import "dotenv/config";
import { SignJWT } from "jose";

function argValue(flag: string): string | undefined {
  const prefix = `--${flag}=`;
  const match = process.argv.find((value) => value.startsWith(prefix));
  return match ? match.slice(prefix.length) : undefined;
}

async function main() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set.");

  const email = argValue("email") ?? process.env.ADMIN_EMAIL ?? "owner@amtulnoorlibrary.com";
  const role = argValue("role")?.toUpperCase() === "STAFF" ? "STAFF" : "ADMIN";

  const token = await new SignJWT({ email, role, userId: Number(argValue("userId") ?? 0) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(new TextEncoder().encode(secret));

  console.log(token);
}

void main();