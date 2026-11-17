"use server";

import { revalidatePath } from "next/cache";
import { errorState, type ActionState } from "@/lib/action-result";
import { actionPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Records that a WhatsApp fee reminder went out for one member and one month.
 *
 * The count is kept per (member, month) rather than in the browser, so it
 * survives a reload and follows the owner from one device to another. Because
 * the month is part of the key, the next month simply has no row yet and the
 * count starts again from zero.
 */
export async function recordReminderSentAction(
  memberId: number,
  month: string,
): Promise<ActionState> {
  const gate = await actionPermission("REMINDERS");
  if ("denied" in gate) return gate.denied;

  if (!Number.isInteger(memberId) || memberId <= 0) {
    return errorState("Member not found.");
  }
  if (!MONTH_KEY.test(month)) {
    return errorState("Choose a valid month.");
  }

  try {
    const now = new Date();
    await prisma.reminderSent.upsert({
      where: { memberId_month: { memberId, month } },
      create: { memberId, month, count: 1, lastSentAt: now },
      update: { count: { increment: 1 }, lastSentAt: now },
    });

    // The count is also read on the server, so a later page load shows it too.
    revalidatePath("/reminders");
    return { status: "success" };
  } catch {
    return errorState("Could not record the reminder. Please try again.");
  }
}
