/**
 * Prints a session cookie value for the local development admin, so pages can be
 * smoke tested with curl:
 *
 *   npx tsx prisma/dev-token.ts
 *
 * Development only. It signs with AUTH_SECRET exactly like src/lib/auth.ts.
 */
import "dotenv/config";
import { SignJWT } from "jose";

async function main() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set.");

  const email = process.env.ADMIN_EMAIL ?? "owner@amtulnoorlibrary.com";

  const token = await new SignJWT({ email, role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(new TextEncoder().encode(secret));

  console.log(token);
}

void main();