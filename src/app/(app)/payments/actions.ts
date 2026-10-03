"use server";

import { revalidatePath } from "next/cache";
import { errorState, prismaErrorMessage, successState, type ActionState } from "@/lib/action-result";
import { parseInputDate } from "@/lib/format";
import { nextPaymentId } from "@/lib/ids";
import { PAYMENT_ID_PREFIX } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { getMonthlyFee, setMonthlyFee } from "@/lib/settings";
import { feeFormSchema, fieldErrors, monthKeySchema, paymentFormSchema } from "@/lib/validators";

function revalidateAll() {
  revalidatePath("/dashboard");
  revalidatePath("/members");
  revalidatePath("/payments");
  revalidatePath("/seats");
}

function bumpPaymentId(paymentId: string, offset: number): string {
  const number = Number(paymentId.slice(PAYMENT_ID_PREFIX.length)) + offset;
  return `${PAYMENT_ID_PREFIX}${String(number).padStart(4, "0")}`;
}

function joinedMonthOf(joiningDate: Date): string {
  return `${joiningDate.getUTCFullYear()}-${String(joiningDate.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Every payment is its own row. Previous payments are never overwritten. */
export async function recordPaymentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = paymentFormSchema.safeParse({
    memberId: formData.get("memberId"),
    month: formData.get("month"),
    amount: formData.get("amount"),
    paymentMode: formData.get("paymentMode"),
    paymentDate: formData.get("paymentDate"),
    status: formData.get("status"),
    remarks: formData.get("remarks"),
  });

  if (!parsed.success) {
    return errorState("Please check the highlighted fields.", fieldErrors(parsed.error));
  }

  const data = parsed.data;

  try {
    const member = await prisma.member.findUnique({
      where: { id: data.memberId },
      select: { id: true, name: true, joiningDate: true },
    });
    if (!member) {
      return errorState("That member no longer exists.", { memberId: "Select a member" });
    }

    const joinedMonth = joinedMonthOf(member.joiningDate);
    if (data.month < joinedMonth) {
      return errorState(
        `${member.name} joined in ${joinedMonth}, so an earlier month cannot be recorded.`,
        { month: "Month is before the joining date" },
      );
    }

    await prisma.payment.create({
      data: {
        paymentId: await nextPaymentId(),
        memberId: data.memberId,
        month: data.month,
        amount: data.amount,
        paymentMode: data.paymentMode,
        paymentDate: parseInputDate(data.paymentDate),
        status: data.status,
        remarks: data.remarks ?? null,
      },
    });

    revalidateAll();
    return successState(`Payment recorded for ${member.name}.`);
  } catch (error) {
    return errorState(prismaErrorMessage(error));
  }
}

export async function updatePaymentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = Number(formData.get("recordId"));
  if (!Number.isInteger(id) || id <= 0) return errorState("Payment not found.");

  const parsed = paymentFormSchema.safeParse({
    memberId: formData.get("memberId"),
    month: formData.get("month"),
    amount: formData.get("amount"),
    paymentMode: formData.get("paymentMode"),
    paymentDate: formData.get("paymentDate"),
    status: formData.get("status"),
    remarks: formData.get("remarks"),
  });

  if (!parsed.success) {
    return errorState("Please check the highlighted fields.", fieldErrors(parsed.error));
  }

  try {
    const existing = await prisma.payment.findUnique({
      where: { id },
      select: { id: true, member: { select: { name: true } } },
    });
    if (!existing) return errorState("Payment not found.");

    await prisma.payment.update({
      where: { id },
      data: {
        memberId: parsed.data.memberId,
        month: parsed.data.month,
        amount: parsed.data.amount,
        paymentMode: parsed.data.paymentMode,
        paymentDate: parseInputDate(parsed.data.paymentDate),
        status: parsed.data.status,
        remarks: parsed.data.remarks ?? null,
      },
    });

    revalidateAll();
    return successState(`Payment updated for ${existing.member.name}.`);
  } catch (error) {
    return errorState(prismaErrorMessage(error));
  }
}

/**
 * Creates one Pending row for every active member who has no record at all for
 * the chosen month. Existing records are never touched.
 */
export async function generatePendingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = monthKeySchema.safeParse(formData.get("month"));
  if (!parsed.success) {
    return errorState("Choose a valid month.", { month: "Choose a valid month" });
  }

  const month = parsed.data;
  const fee = await getMonthlyFee();

  const members = await prisma.member.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, joiningDate: true, payments: { where: { month }, select: { id: true } } },
  });

  const missing = members.filter(
    (member) => member.payments.length === 0 && joinedMonthOf(member.joiningDate) <= month,
  );

  if (missing.length === 0) {
    return errorState(
      "Every active member already has a record for this month, so nothing was added.",
    );
  }

  const firstPaymentId = await nextPaymentId();
  await prisma.payment.createMany({
    data: missing.map((member, index) => ({
      paymentId: bumpPaymentId(firstPaymentId, index),
      memberId: member.id,
      month,
      amount: fee,
      paymentMode: "CASH" as const,
      paymentDate: parseInputDate(`${month}-01`),
      status: "PENDING" as const,
      remarks: "Auto generated as pending",
    })),
  });

  revalidateAll();
  return successState(
    `${missing.length} pending ${missing.length === 1 ? "payment" : "payments"} added.`,
  );
}

export async function updateFeeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = feeFormSchema.safeParse({ fee: formData.get("fee") });
  if (!parsed.success) {
    return errorState("Please check the fee amount.", fieldErrors(parsed.error));
  }
  await setMonthlyFee(parsed.data.fee);
  revalidateAll();
  return successState("Monthly fee updated.");
}

/** Active members, used by the member picker in the payment form. */
export async function searchMembersAction(): Promise<
  { id: number; label: string; hint: string | null }[]
> {
  const members = await prisma.member.findMany({
    where: { status: "ACTIVE" },
    include: { seat: { include: { room: true } } },
    orderBy: { name: "asc" },
    take: 500,
  });
  return members.map((member) => ({
    id: member.id,
    label: `${member.name} · ${member.memberId}`,
    hint: member.seat ? `${member.seat.room.name} Seat ${member.seat.seatNumber}` : "No seat",
  }));
}