import type { Prisma } from "@/generated/prisma/client";
import {
  LIBRARY_PREPAID_OFFER,
  monthlyFeeForSeat,
  prepaidPriceForSeat,
} from "@/lib/constants";
import {
  gapMonthsBetween,
  monthKeyFromInputDate,
  parseInputDate,
  shiftMonthKey,
} from "@/lib/format";
import { bumpPaymentId, newReceiptToken, nextPaymentId } from "@/lib/ids";

/**
 * Rewrites every unpaid month for one member to their current fee.
 *
 * A pending row stores the amount at the moment it was generated, so changing a
 * member's fee afterwards would leave the row showing the old figure — the
 * "member pays 500 but the list still says 700" inconsistency. Paid and waived
 * rows are historical and never touched; only PENDING rows follow the fee.
 *
 * Lives here rather than in the members action file so it can be unit tested and
 * reused without pulling in the "use server" boundary.
 */
export async function syncPendingAmounts(
  tx: Prisma.TransactionClient,
  memberId: number,
  fee: number,
): Promise<void> {
  await tx.payment.updateMany({
    where: { memberId, status: "PENDING" },
    data: { amount: fee },
  });
}

export type ThreePlusOneOfferInput = {
  memberId: number;
  startMonth: string;
  /** The desk decides the price: ₹2100 without a locker, ₹2400 with one. */
  hasLocker: boolean;
  paymentMode: "CASH" | "ONLINE";
  paymentDate: Date;
  /**
   * Set when applying the offer to an existing member. Their four month rows
   * are replaced so the old three-at-₹700 pattern cannot survive alongside the
   * new, correct one.
   */
  replaceExisting?: boolean;
};

/**
 * Records the 3 + 1 offer as four explicit rows.
 *
 * The owner asked for the first row to show the whole amount paid up front —
 * ₹2100 for a plain seat, ₹2400 for a locker seat — rather than splitting it
 * into three ₹700 rows. The next two rows are zero-rupee PAID entries marked as
 * covered by that payment, and the fourth is the free month. Keeping all four
 * rows means every month has its own status and receipt, while the money is
 * only counted once.
 */
export async function recordThreePlusOneOffer(
  tx: Prisma.TransactionClient,
  {
    memberId,
    startMonth,
    hasLocker,
    paymentMode,
    paymentDate,
    replaceExisting = false,
  }: ThreePlusOneOfferInput,
): Promise<{ months: string[]; monthlyFee: number; prepaidAmount: number }> {
  const months = Array.from(
    { length: LIBRARY_PREPAID_OFFER.totalMonths },
    (_, index) => shiftMonthKey(startMonth, index),
  );
  const monthlyFee = monthlyFeeForSeat(hasLocker);
  const prepaidAmount = prepaidPriceForSeat(hasLocker);

  if (replaceExisting) {
    await tx.payment.deleteMany({ where: { memberId, month: { in: months } } });
  }

  // One read gives the whole run of sequential public payment ids; bumpPaymentId
  // keeps them unique without a query per row.
  const firstPaymentId = await nextPaymentId(tx);
  await tx.payment.createMany({
    data: months.map((month, index) => ({
      paymentId: bumpPaymentId(firstPaymentId, index),
      memberId,
      month,
      amount: index === 0 ? prepaidAmount : 0,
      paymentMode: index === 0 ? paymentMode : ("OFFER" as const),
      paymentDate,
      status: "PAID" as const,
      remarks:
        index === 0
          ? "3+1 offer — paid in advance"
          : index < LIBRARY_PREPAID_OFFER.paidMonths
            ? "Covered by 3+1 (paid in advance)"
            : "Free month — 3 + 1 offer",
      receiptToken: newReceiptToken(),
    })),
  });

  return { months, monthlyFee, prepaidAmount };
}

/**
 * Marks the months a returning member was away as NOT_APPLICABLE.
 *
 * When someone leaves and comes back months later, the months in between are not
 * owed — they were not a member then. The library keeps one joining date and one
 * leaving date per member, so the break is reconstructed from the leaving date
 * that was recorded and the rejoin date being entered now: every month strictly
 * after the one they left in, up to just before the one they return in.
 *
 * A PAID month is history and a WAIVED or ON_HOLD month is a call the owner
 * already made, so those are left alone. Anything else in the gap — including a
 * PENDING row wrongly generated while they were away — becomes NOT_APPLICABLE.
 * Missing months get a fresh row so the gap is visible in the payment history
 * rather than silently empty.
 */
export async function markGapMonthsNotApplicable(
  tx: Prisma.TransactionClient,
  memberId: number,
  leavingDate: Date | null,
  rejoiningDate: Date,
): Promise<void> {
  if (!leavingDate) return;
  const gap = gapMonthsBetween(
    monthKeyFromInputDate(leavingDate.toISOString()),
    monthKeyFromInputDate(rejoiningDate.toISOString()),
  );
  if (gap.length === 0) return;

  // Months that already hold a real record we must not turn into "not
  // applicable".
  const settled = await tx.payment.findMany({
    where: { memberId, month: { in: gap }, status: { in: ["PAID", "WAIVED", "ON_HOLD"] } },
    select: { month: true },
  });
  const keep = new Set(settled.map((row) => row.month));
  const toMark = gap.filter((month) => !keep.has(month));

  if (toMark.length === 0) return;

  // Rows already in the gap take the new status; the rest are created below.
  await tx.payment.updateMany({
    where: { memberId, month: { in: toMark }, status: { notIn: ["PAID", "WAIVED", "ON_HOLD"] } },
    data: { status: "NOT_APPLICABLE", remarks: "Away period before rejoining" },
  });

  const existing = await tx.payment.findMany({
    where: { memberId, month: { in: toMark } },
    select: { month: true },
  });
  const have = new Set(existing.map((row) => row.month));
  const missing = toMark.filter((month) => !have.has(month));
  if (missing.length === 0) return;

  const firstPaymentId = await nextPaymentId(tx);
  await tx.payment.createMany({
    data: missing.map((month, index) => ({
      paymentId: bumpPaymentId(firstPaymentId, index),
      memberId,
      month,
      amount: 0,
      paymentMode: "OFFER" as const,
      paymentDate: parseInputDate(`${month}-01`),
      status: "NOT_APPLICABLE" as const,
      remarks: "Away period before rejoining",
      receiptToken: newReceiptToken(),
    })),
  });
}
