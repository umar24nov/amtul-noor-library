import { MEMBER_ID_PREFIX, PAYMENT_ID_PREFIX } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import type { Payment, Prisma } from "@/generated/prisma/client";

type Db = Prisma.TransactionClient | typeof prisma;

function nextPaddedId(prefix: string, lastId: string | null | undefined, width: number): string {
  const lastNumber = lastId ? Number(lastId.slice(prefix.length)) : 0;
  const next = Number.isFinite(lastNumber) && lastNumber > 0 ? lastNumber + 1 : 1;
  return `${prefix}${String(next).padStart(width, "0")}`;
}

/** Sequential public member id such as ATN001. */
export async function nextMemberId(db: Db = prisma): Promise<string> {
  const last = await db.member.findFirst({
    orderBy: { memberId: "desc" },
    select: { memberId: true },
  });
  return nextPaddedId(MEMBER_ID_PREFIX, last?.memberId, 3);
}

/** Sequential public payment id such as PAY0001. */
export async function nextPaymentId(db: Db = prisma): Promise<string> {
  const last = await db.payment.findFirst({
    orderBy: { paymentId: "desc" },
    select: { paymentId: true },
  });
  return nextPaddedId(PAYMENT_ID_PREFIX, last?.paymentId, 4);
}

/** Prisma returns Decimal for money columns; the UI works with numbers. */
export function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (value === null || value === undefined) return 0;
  return Number(value);
}

export function sumPayments(payments: Pick<Payment, "amount" | "status">[]): number {
  return payments.reduce((total, payment) => total + toNumber(payment.amount), 0);
}