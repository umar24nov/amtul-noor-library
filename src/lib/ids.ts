import { randomBytes } from "node:crypto";
import { MEMBER_ID_PREFIX, PAYMENT_ID_PREFIX } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import type { Payment, Prisma } from "@/generated/prisma/client";

/** Next EXP number, never reused. */
export async function nextExpenseId(db: Db = prisma): Promise<string> {
  const last = await db.expense.findFirst({
    orderBy: { id: "desc" },
    select: { expenseId: true },
  });
  if (!last) return "EXP0001";
  const match = last.expenseId.match(/EXP(\d+)/);
  const next = match ? Number(match[1]) + 1 : 1;
  return `EXP${String(next).padStart(4, "0")}`;
}

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

/**
 * The payment id `offset` places after the given one, e.g. PAY0001 + 2 ->
 * PAY0003. Lets a batch created together take a run of sequential ids from the
 * single "last id" read, instead of querying for each row.
 */
export function bumpPaymentId(paymentId: string, offset: number): string {
  const number = Number(paymentId.slice(PAYMENT_ID_PREFIX.length)) + offset;
  return `${PAYMENT_ID_PREFIX}${String(number).padStart(4, "0")}`;
}

/**
 * A fresh, unguessable token used to retrieve a payment's receipt via the
 * public /receipts/<token> route without a session. 144 bits of randomness is
 * far more than a guesser can search, and each token only reveals one receipt.
 */
export function newReceiptToken(): string {
  return randomBytes(18).toString("hex");
}

/**
 * A member's permanent, unguessable token that powers their reusable /pay/<token>
 * link. Same length and strength as the per-receipt token.
 */
export function newPayToken(): string {
  return randomBytes(18).toString("hex");
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