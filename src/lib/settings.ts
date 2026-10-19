import "server-only";
import { DEFAULT_MONTHLY_FEE } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

const MONTHLY_FEE_KEY = "monthlyFee";

/** Standard monthly membership fee, used when generating pending payments. */
export async function getMonthlyFee(): Promise<number> {
  const setting = await prisma.setting.findUnique({ where: { key: MONTHLY_FEE_KEY } });
  const value = Number(setting?.value ?? DEFAULT_MONTHLY_FEE);
  return Number.isFinite(value) && value > 0 ? value : Number(DEFAULT_MONTHLY_FEE);
}

export async function setMonthlyFee(fee: number): Promise<void> {
  await prisma.setting.upsert({
    where: { key: MONTHLY_FEE_KEY },
    update: { value: String(fee) },
    create: { key: MONTHLY_FEE_KEY, value: String(fee) },
  });
}

const MEMBER_FEE_PREFIX = "memberMonthlyFee:";

export const memberFeeKey = (memberId: number) => `${MEMBER_FEE_PREFIX}${memberId}`;

/**
 * A member's own monthly fee, stored per member because the standard fee
 * changes over time and not every member moves with it. A zero is a real
 * setting (someone who uses a seat with no fee), so it is kept as 0 rather
 * than falling back to the standard.
 *
 * `null` (or a member who has no row) means "use the standard fee".
 */
export async function getMemberFee(memberId: number): Promise<number | null> {
  const setting = await prisma.setting.findUnique({
    where: { key: memberFeeKey(memberId) },
  });
  if (!setting) return null;
  const value = Number(setting.value);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

/**
 * Every member fee in one read, keyed by member database id, so a whole
 * month of rows can be built without a query per member.
 */
export async function memberFeesByMemberId(): Promise<Map<number, number>> {
  const settings = await prisma.setting.findMany({
    where: { key: { startsWith: MEMBER_FEE_PREFIX } },
  });
  const fees = new Map<number, number>();
  for (const setting of settings) {
    const memberId = Number(setting.key.slice(MEMBER_FEE_PREFIX.length));
    const value = Number(setting.value);
    if (Number.isInteger(memberId) && Number.isFinite(value) && value >= 0) {
      fees.set(memberId, value);
    }
  }
  return fees;
}

export async function setMemberFee(memberId: number, fee: number): Promise<void> {
  await prisma.setting.upsert({
    where: { key: memberFeeKey(memberId) },
    update: { value: String(fee) },
    create: { key: memberFeeKey(memberId), value: String(fee) },
  });
}

/** Removes a member's own fee, so the standard fee applies again. */
export async function clearMemberFee(memberId: number): Promise<void> {
  await prisma.setting.deleteMany({ where: { key: memberFeeKey(memberId) } });
}

export function effectiveMemberFee(
  memberFee: number | null | undefined,
  standardFee: number,
): number {
  return memberFee ?? standardFee;
}

/**
 * Adds the fee each row pays (its own fee or the standard) to every row that
 * has a member `id`, so a list page can hand the right default to an edit
 * dialog without a settings query per member.
 */
export function withMemberFees<T extends { id: number }>(
  rows: readonly T[],
  standardFee: number,
  fees: ReadonlyMap<number, number>,
): (T & { defaultFee: number })[] {
  return rows.map((row) => ({
    ...row,
    defaultFee: effectiveMemberFee(fees.get(row.id) ?? null, standardFee),
  }));
}