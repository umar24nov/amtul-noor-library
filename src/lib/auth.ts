import "server-only";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type { Permission, RoleLevel } from "@/generated/prisma/enums";

export const SESSION_COOKIE = "anl_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12; // 12 hours

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set to a random string of at least 32 characters.");
  }
  return new TextEncoder().encode(secret);
}

/**
 * What a signed-in person is, resolved for the current request. The cookie only
 * carries the identity (see {@link SessionToken}); the permission list is looked
 * up from the database each request so a change to a role applies immediately.
 */
export type SessionPayload = {
  email: string;
  userId: number;
  roleId: number;
  level: RoleLevel;
  /** The areas this person's role grants. Ignored for a full admin, who always
   *  has everything. */
  permissions: Permission[];
};

/** The identity stored in the session cookie. Deliberately small: permissions
 *  are not baked in, so they can change between requests. */
type SessionToken = { email: string; userId: number; roleId: number; level: RoleLevel };

/**
 * The seeded full-admin role. The env-var admin is provisioned into it, and the
 * last-active-admin guards count roles at this level, so it is fetched in a few
 * places. The migration seeds it; the create is only a safety net on a fresh
 * host where the seed somehow did not run.
 */
export async function getBuiltInAdminRole(): Promise<{ id: number; level: RoleLevel }> {
  const builtIn = await prisma.role.findFirst({
    where: { builtIn: true },
    orderBy: { id: "asc" },
    select: { id: true, level: true },
  });
  if (builtIn) return builtIn;

  const adminLevel = await prisma.role.findFirst({
    where: { level: "ADMIN" },
    orderBy: { id: "asc" },
    select: { id: true, level: true },
  });
  if (adminLevel) return adminLevel;

  return prisma.role.create({
    data: { name: "Admin", level: "ADMIN", builtIn: true },
    select: { id: true, level: true },
  });
}

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
): Promise<SessionToken | null> {
  const normalisedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: normalisedEmail },
    include: { role: { select: { level: true } } },
  });
  if (user) {
    if (!user.active) return null;
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return null;
    await recordLogin(user.id);
    return { email: user.email, userId: user.id, roleId: user.roleId, level: user.role.level };
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

  const adminRole = await getBuiltInAdminRole();

  let provisioned: { id: number; email: string; roleId: number; level: RoleLevel };
  try {
    provisioned = await prisma.user.create({
      data: { email: normalisedEmail, passwordHash: adminHash, roleId: adminRole.id },
      select: { id: true, email: true, roleId: true, role: { select: { level: true } } },
    }).then((row) => ({
      id: row.id,
      email: row.email,
      roleId: row.roleId,
      level: row.role.level,
    }));
  } catch {
    // Two first logins racing each other; the row is there now, use it.
    const existing = await prisma.user.findUnique({
      where: { email: normalisedEmail },
      select: { id: true, email: true, roleId: true, active: true, role: { select: { level: true } } },
    });
    if (!existing || !existing.active) return null;
    provisioned = {
      id: existing.id,
      email: existing.email,
      roleId: existing.roleId,
      level: existing.role.level,
    };
  }

  await recordLogin(provisioned.id);
  return { email: provisioned.email, userId: provisioned.id, roleId: provisioned.roleId, level: provisioned.level };
}

export async function createSession(payload: SessionToken): Promise<void> {
  const token = await new SignJWT({
    email: payload.email,
    userId: payload.userId,
    roleId: payload.roleId,
    level: payload.level,
  })
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

/**
 * Reads and verifies the session cookie, then resolves the account's current
 * role and permissions from the database.
 *
 * The database is the source of truth for the role, its level and its
 * permissions rather than the token: a change to someone's role, or deactivating
 * their account, takes effect on their next request instead of waiting out the
 * twelve-hour cookie. The token only proves who they are.
 */
export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  let claims: { email: string; userId: number; roleId: number };
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (typeof payload.email !== "string") return null;
    claims = {
      email: payload.email,
      userId: typeof payload.userId === "number" ? payload.userId : 0,
      roleId: typeof payload.roleId === "number" ? payload.roleId : 0,
    };
  } catch {
    return null;
  }

  // A cookie issued before ids were added has no id; fall back to the email so
  // an older session is not signed out. Look the account up by id when present.
  const row = claims.userId
    ? await prisma.user.findUnique({
        where: { id: claims.userId },
        select: { email: true, id: true, active: true, role: { select: { id: true, level: true, permissions: true } } },
      })
    : await prisma.user.findUnique({
        where: { email: claims.email },
        select: { email: true, id: true, active: true, role: { select: { id: true, level: true, permissions: true } } },
      });

  if (!row || !row.active) return null;

  return {
    email: row.email,
    userId: row.id,
    roleId: row.role.id,
    level: row.role.level,
    permissions: row.role.permissions,
  };
});

export type CurrentUser = {
  id: number;
  name: string | null;
  email: string;
  roleId: number;
  level: RoleLevel;
};

/**
 * The signed-in person's own row. The session carries the id, so that is used
 * first; a cookie issued before the id was added falls back to the email, so an
 * older session can still manage its own profile instead of being locked out.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await getSession();
  if (!session) return null;

  const select = {
    id: true,
    name: true,
    email: true,
    roleId: true,
    role: { select: { level: true } },
  } as const;

  const row = session.userId
    ? await prisma.user.findUnique({ where: { id: session.userId }, select })
    : await prisma.user.findUnique({ where: { email: session.email }, select });
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    roleId: row.roleId,
    level: row.role.level,
  };
});
