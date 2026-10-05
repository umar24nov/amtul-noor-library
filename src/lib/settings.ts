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