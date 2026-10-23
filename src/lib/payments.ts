import { shiftMonthKey } from "@/lib/format";
import type { PaymentStatus } from "@/generated/prisma/enums";

/**
 * The remark carried by a pending row the generator created.
 *
 * It is what tells a placeholder apart from a real record: a pending row with
 * this remark was written to say "this month is owed", not "this money came in".
 */
export const AUTO_PENDING_REMARK = "Auto generated as pending";

/** The month a member joined, as a `YYYY-MM` key. */
export function joinedMonthKey(joiningDate: Date): string {
  return `${joiningDate.getUTCFullYear()}-${String(joiningDate.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * The first month a member can be pending for: the month after they joined.
 *
 * A member who joins on 22 October 2026 settles the October fee when they join,
 * so October is never given a pending row. Their dues are monitored from
 * November onwards, and each pending row is dated on the joining day rather than
 * on the first of the month, so the date says when the fee actually fell due.
 */
export function firstPendingMonth(joiningDate: Date): string {
  return shiftMonthKey(joinedMonthKey(joiningDate), 1);
}

/**
 * The date a pending row carries for a given month: the joining day, clamped to
 * the length of that month.
 *
 * Someone who joined on the 31st and is pending for February gets 28 February
 * (or 29 in a leap year) rather than a date that does not exist.
 */
export function pendingDueDate(month: string, joiningDate: Date): Date {
  const [year, monthNumber] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const day = Math.min(joiningDate.getUTCDate(), daysInMonth);
  return new Date(Date.UTC(year, monthNumber - 1, day));
}

/**
 * Whether a row is a pending placeholder the generator wrote.
 *
 * Only such a row may be reused when a payment is recorded: a pending row that
 * a person wrote by hand is a real record and is never overwritten.
 */
export function isAutoPendingRow(row: {
  status: PaymentStatus;
  remarks: string | null;
}): boolean {
  return row.status === "PENDING" && row.remarks === AUTO_PENDING_REMARK;
}

/**
 * Brings pending payments to the top by default; otherwise brings the chosen status to the top.
 */
export function prioritiseStatus<T extends { status: PaymentStatus }>(
  rows: T[],
  status: PaymentStatus | "ALL" | undefined,
): T[] {
  const target = status === "ALL" ? "PENDING" : status;
  if (!target) return rows;
  const chosen = rows.filter((row) => row.status === target);
  const rest = rows.filter((row) => row.status !== target);
  return [...chosen, ...rest];
}
