import "server-only";
import { prisma } from "@/lib/prisma";
import type { ActivityAction } from "@/generated/prisma/enums";

/**
 * Records one entry in the activity history.
 *
 * Writing never fails the caller: a sign-in or a saved change must not be
 * refused because the log could not be written. The email is copied onto the row
 * so the entry still reads well after the account is renamed or removed.
 */
export async function logActivity(
  action: ActivityAction,
  user: { id: number | null; email: string },
  detail = "",
): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: { action, userId: user.id, email: user.email, detail },
    });
  } catch {
    // Best effort only.
  }
}

/** The most recent activity for the Users screen, newest first. */
export async function listRecentActivity(take = 20) {
  return prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take,
    select: { id: true, email: true, action: true, detail: true, createdAt: true },
  });
}
