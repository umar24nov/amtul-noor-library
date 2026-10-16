import "server-only";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/generated/prisma/enums";

export const SESSION_COOKIE = "anl_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12; // 12 hours

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set to a random string of at least 32 characters.");
  }
  return new TextEncoder().encode(secret);
}

export type SessionPayload = { email: string; role: UserRole; userId: number };

/**
 * Next.js expands $VAR inside .env files, so a bcrypt hash stored there has to
 * be written with every $ escaped as \$. Cloud hosts hand the value straight to
 * process.env with no expansion, where the plain $2b$10$ form is correct.
 * Accept either so the same value works locally and on the deployed host.
 */
function normaliseHash(hash: string): string {
  return hash.replaceAll("\\$", "$").trim().replace(/^["']|["']$/g, "");
}

const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

/** Stands in for a real hash when the email does not exist, so a missing
 *  account and a wrong password take the same amount of time to reject. */
const DUMMY_HASH = "$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin";

async function recordLogin(userId: number): Promise<void> {
  try {
    await prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
  } catch {
    // Never fail a sign-in because the timestamp could not be written.
  }
}

/**
 * Checks a submitted password against the accounts in the database.
 *
 * The env-var admin (ADMIN_EMAIL / ADMIN_PASSWORD_HASH) is kept as a bootstrap
 * and a break-glass login: if the email matches and the password is right, the
 * account is created as an admin so it can then be managed from the Users
 * screen. Once a row exists for that email, only the row decides — so a
 * password changed in the app cannot be undone by the old env hash.
 */
export async function verifyCredentials(
  email: string,
  password: string,
): Promise<SessionPayload | null> {
  const normalisedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({ where: { email: normalisedEmail } });
  if (user) {
    if (!user.active) return null;
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return null;
    await recordLogin(user.id);
    return { email: user.email, role: user.role, userId: user.id };
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  const configuredHash = process.env.ADMIN_PASSWORD_HASH;
  if (!adminEmail || !configuredHash) return null;
  if (normalisedEmail !== adminEmail.trim().toLowerCase()) {
    // Still run a comparison so timing does not reveal whether the email exists.
    await bcrypt.compare(password, DUMMY_HASH);
    return null;
  }

  const adminHash = normaliseHash(configuredHash);
  if (!BCRYPT_HASH_PATTERN.test(adminHash)) {
    // Almost always the $ signs being eaten by $VAR expansion.
    console.error(
      "ADMIN_PASSWORD_HASH is not a valid bcrypt hash. Generate one with: npm run hash-password -- \"your-password\"",
    );
    return null;
  }

  const valid = await bcrypt.compare(password, adminHash);
  if (!valid) return null;

  let provisioned: { id: number; email: string; role: UserRole; active: boolean };
  try {
    provisioned = await prisma.user.create({
      data: { email: normalisedEmail, passwordHash: adminHash, role: "ADMIN" },
      select: { id: true, email: true, role: true, active: true },
    });
  } catch {
    // Two first logins racing each other; the row is there now, use it.
    const existing = await prisma.user.findUnique({
      where: { email: normalisedEmail },
      select: { id: true, email: true, role: true, active: true },
    });
    if (!existing || !existing.active) return null;
    provisioned = existing;
  }

  await recordLogin(provisioned.id);
  return { email: provisioned.email, role: provisioned.role, userId: provisioned.id };
}

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await new SignJWT({ email: payload.email, role: payload.role, userId: payload.userId })
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
    // Cookies issued before roles existed carry no role. Everyone who could
    // sign in then was an admin, so that is how they are read; the next sign-in
    // re-issues the cookie with the role in it.
    const role: UserRole = payload.role === "STAFF" ? "STAFF" : "ADMIN";
    const userId = typeof payload.userId === "number" ? payload.userId : 0;
    return { email: payload.email, role, userId };
  } catch {
    return null;
  }
});

/** The session, but only when it belongs to an admin. */
export async function getAdminSession(): Promise<SessionPayload | null> {
  const session = await getSession();
  return session?.role === "ADMIN" ? session : null;
}
