import "server-only";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

/** Failures allowed inside the window before the account is locked. */
const MAX_FAILURES = 5;
/** How far back failures are counted, and how long a lockout lasts. */
const WINDOW_MINUTES = 15;
/** Give up on the lockout once an attempt is this old, even if the count is high. */
const ABSOLUTE_LOCK_MINUTES = 60;

export type RateLimitResult = {
  limited: boolean;
  /** Whole minutes left before another attempt would be accepted. */
  retryAfterMinutes: number;
};

function minutesBetween(from: Date, to: Date): number {
  return Math.ceil((to.getTime() - from.getTime()) / 60_000);
}

/** Best-effort client address. Absent behind some proxies and in local dev. */
export async function getClientIp(): Promise<string> {
  try {
    const headerList = await headers();
    const forwarded = headerList.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0]!.trim();
    return headerList.get("x-real-ip")?.trim() ?? "";
  } catch {
    return "";
  }
}

/**
 * Counts recent failures for this email (or, when the email is unknown, for this
 * IP address) and reports whether the next attempt should be refused.
 */
export async function checkLoginRateLimit(
  email: string,
  ip: string,
  now: Date = new Date(),
): Promise<RateLimitResult> {
  const allow: RateLimitResult = { limited: false, retryAfterMinutes: 0 };
  const windowStart = new Date(now.getTime() - WINDOW_MINUTES * 60_000);

  try {
    const failures = await prisma.loginAttempt.findMany({
      where: {
        createdAt: { gte: windowStart },
        OR: [{ email: email.toLowerCase() }, ...(ip ? [{ ip }] : [])],
      },
      select: { createdAt: true },
      orderBy: { createdAt: "desc" },
    });

    if (failures.length < MAX_FAILURES) return allow;

    const oldest = failures[failures.length - 1]!.createdAt;
    const age = minutesBetween(oldest, now);
    if (age >= ABSOLUTE_LOCK_MINUTES) return allow;

    return { limited: true, retryAfterMinutes: Math.max(1, WINDOW_MINUTES - age) };
  } catch {
    // Never lock the owner out because the limiter itself failed to run.
    console.error("login rate limit check failed; allowing the attempt");
    return allow;
  }
}

/** Records one rejected attempt and prunes rows that can no longer matter. */
export async function recordFailedLogin(email: string, ip: string): Promise<void> {
  try {
    await prisma.$transaction([
      prisma.loginAttempt.create({
        data: { email: email.toLowerCase(), ip },
      }),
      prisma.loginAttempt.deleteMany({
        where: { createdAt: { lt: new Date(Date.now() - ABSOLUTE_LOCK_MINUTES * 60_000) } },
      }),
    ]);
  } catch {
    console.error("could not record the failed login attempt");
  }
}

/** Clears the counter after a successful sign-in so a typo does not accumulate. */
export async function clearLoginFailures(email: string): Promise<void> {
  try {
    await prisma.loginAttempt.deleteMany({ where: { email: email.toLowerCase() } });
  } catch {
    console.error("could not clear the login failure counter");
  }
}
