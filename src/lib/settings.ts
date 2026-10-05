import "server-only";
import {
  DEFAULT_MONTHLY_FEE,
  DEFAULT_MONTHLY_FEE_DUE_DAY,
  MAX_FEE_DUE_DAY,
  MIN_FEE_DUE_DAY,
} from "@/lib/constants";
import { prisma } from "@/lib/prisma";

const MONTHLY_FEE_KEY = "monthlyFee";
const FEE_DUE_DAY_KEY = "monthlyFeeDueDay";

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

/**
 * Day of the month the fee falls due, shared by every month.
 *
 * A missing or nonsensical row falls back to the default rather than throwing,
 * because a corrupt setting must not take the dashboard down with it. The
 * clamping happens here rather than at the edges so a bad value stored outside
 * the app cannot produce an impossible date later.
 */
export async function getMonthlyFeeDueDay(): Promise<number> {
  const setting = await prisma.setting.findUnique({ where: { key: FEE_DUE_DAY_KEY } });
  const value = Number(setting?.value ?? DEFAULT_MONTHLY_FEE_DUE_DAY);
  if (!Number.isInteger(value)) return Number(DEFAULT_MONTHLY_FEE_DUE_DAY);
  return Math.min(Math.max(value, MIN_FEE_DUE_DAY), MAX_FEE_DUE_DAY);
}

export async function setMonthlyFeeDueDay(day: number): Promise<void> {
  const safe = Math.min(Math.max(Math.round(day), MIN_FEE_DUE_DAY), MAX_FEE_DUE_DAY);
  await prisma.setting.upsert({
    where: { key: FEE_DUE_DAY_KEY },
    update: { value: String(safe) },
    create: { key: FEE_DUE_DAY_KEY, value: String(safe) },
  });
}