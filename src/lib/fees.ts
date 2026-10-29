import { monthKeyFromInputDate } from "@/lib/format";
import type { PaymentStatus } from "@/generated/prisma/enums";

/** Effective status of one member for one month. */
export type MonthStatus = PaymentStatus | "NONE";

/**
 * The status a month should be treated as, from the rows recorded for it.
 *
 * A single record per month is the normal case, but the order matters when a
 * month has more than one: a payment settles the month even if another row was
 * left on hold, and a waived month is not money owed.
 */
export function deriveMonthStatus(
  payments: readonly { status: PaymentStatus }[],
  joinedAfterMonth: boolean,
): MonthStatus {
  if (joinedAfterMonth) return "NOT_APPLICABLE";
  if (payments.some((payment) => payment.status === "PAID")) return "PAID";
  if (payments.some((payment) => payment.status === "WAIVED")) return "WAIVED";
  if (payments.some((payment) => payment.status === "ON_HOLD")) return "ON_HOLD";
  if (payments.some((payment) => payment.status === "NOT_APPLICABLE")) return "NOT_APPLICABLE";
  if (payments.some((payment) => payment.status === "PENDING")) return "PENDING";
  return "NONE";
}

export type ArrearsSummary = {
  /** Months still owed, oldest first. */
  months: string[];
  /** Fee multiplied by the number of owed months. */
  totalDue: number;
};

export type ArrearsInput = {
  /** This member's own monthly fee. */
  fee: number;
  /** Joining date as an ISO date string; only the YYYY-MM part is used. */
  joiningDate: string;
  /** Month keys to check, oldest first. */
  months: readonly string[];
  /** Payment rows grouped by YYYY-MM key. A missing month is treated as NONE. */
  paymentsByMonth: ReadonlyMap<string, readonly { status: PaymentStatus }[]>;
};

/**
 * Works out which months a member still owes and what they add up to.
 *
 * A month is owed when it has no record at all, or when the only records are
 * PENDING. Months that are paid, waived, on hold, or before the member joined
 * are not owed. The stored pending amount is kept in step with the fee, so
 * using the current fee here avoids showing a stale figure.
 */
export function summarizeArrears({
  fee,
  joiningDate,
  months,
  paymentsByMonth,
}: ArrearsInput): ArrearsSummary {
  const joinedMonth = monthKeyFromInputDate(joiningDate);
  // No fee means nothing to owe, whatever the month.
  if (fee <= 0) return { months: [], totalDue: 0 };

  const owed: string[] = [];
  let totalDue = 0;

  for (const key of months) {
    const status = deriveMonthStatus(paymentsByMonth.get(key) ?? [], joinedMonth > key);
    if (status !== "PENDING" && status !== "NONE") continue;
    owed.push(key);
    totalDue += fee;
  }

  return { months: owed, totalDue };
}
