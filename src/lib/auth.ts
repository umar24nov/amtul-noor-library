import "server-only";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { cache } from "react";

export const SESSION_COOKIE = "anl_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12; // 12 hours

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set to a random string of at least 32 characters.");
  }
  return new TextEncoder().encode(secret);
}

export type SessionPayload = { email: string };

/**
 * Next.js expands $VAR inside .env files, so a bcrypt hash stored there has to
 * be written with every $ escaped as \$. Cloud hosts hand the value straight to
 * process.env with no expansion, where the plain $2b$10$ form is correct.
 * Accept either so the same value works locally and on the deployed host.
 */
function normaliseHash(hash: string): string {
  return hash.replaceAll("\\$", "$").trim().replace(/^["']|["']$/g, "");
}

/** Compares the submitted credentials with the admin account in the environment. */
export async function verifyCredentials(
  email: string,
  password: string,
): Promise<SessionPayload | null> {
  const adminEmail = process.env.ADMIN_EMAIL;
  const configuredHash = process.env.ADMIN_PASSWORD_HASH;
  if (!adminEmail || !configuredHash) return null;
  if (email.toLowerCase() !== adminEmail.toLowerCase()) {
    // Still run a comparison so timing does not reveal whether the email exists.
    await bcrypt.compare(password, "$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin");
    return null;
  }

  const adminHash = normaliseHash(configuredHash);
  if (!/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(adminHash)) {
    // Almost always the $ signs being eaten by $VAR expansion.
    console.error(
      "ADMIN_PASSWORD_HASH is not a valid bcrypt hash. Generate one with: npm run hash-password -- \"your-password\"",
    );
    return null;
  }

  const valid = await bcrypt.compare(password, adminHash);
  return valid ? { email: adminEmail } : null;
}

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await new SignJWT({ email: payload.email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSecretKey());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/** Reads and verifies the session cookie. Returns null when not signed in. */
export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (typeof payload.email !== "string") return null;
    return { email: payload.email };
  } catch {
    return null;
  }
});