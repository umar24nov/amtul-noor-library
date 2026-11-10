"use server";

import { revalidatePath } from "next/cache";
import { errorState, prismaErrorMessage, successState, type ActionState } from "@/lib/action-result";
import { getSession } from "@/lib/auth";
import { actionPermission, canViewPayments } from "@/lib/permissions";
import { parseInputDate, monthKeyFromInputDate } from "@/lib/format";
import { nextPaymentId, newReceiptToken, bumpPaymentId } from "@/lib/ids";
import { prisma } from "@/lib/prisma";
import { getMonthlyFee, memberFeesByMemberId, setMonthlyFee } from "@/lib/settings";
import {
  AUTO_PENDING_REMARK,
  firstPendingMonth,
  joinedMonthKey,
  pendingDueDate,
} from "@/lib/payments";
import { feeFormSchema, fieldErrors, monthKeySchema, paymentFormSchema } from "@/lib/validators";
import { listPayments } from "@/lib/queries";
import {
  getReceiptContext,
  receiptEmailIsConfigured,
  sendReceiptEmail,
} from "@/lib/receipts";
import type { PaymentMode, PaymentStatus } from "@/generated/prisma/enums";
import { logMemberChange, MEMBER_AUDIT_ACTIONS, type MemberAuditChange } from "@/lib/member-audit";

function revalidateAll() {
  revalidatePath("/dashboard");
  revalidatePath("/members");
  revalidatePath("/payments");
  revalidatePath("/reminders");
  revalidatePath("/seats");
}

/**
 * Returns the next batch of rows for the scrolling payments list.
 *
 * Read-only, and it reuses the same query as the page so a batch that arrives
 * by scrolling cannot disagree with what a full page load would have shown.
 */
export async function loadMorePaymentsAction(filters: {
  month?: string;
  memberId?: string;
  q?: string;
  mode?: string;
  status?: string;
  page?: number;
}) {
  const viewer = await getSession();
  // Read-only viewers may scroll the list too, so the read-only permission is
  // enough here.
  if (!viewer || !canViewPayments(viewer)) return { payments: [], total: 0 };
  const result = await listPayments({
    month: filters.month,
    memberId: filters.memberId,
    memberSearch: filters.q,
    mode: filters.mode as PaymentMode | "ALL" | undefined,
    status: filters.status as PaymentStatus | "ALL" | undefined,
    page: filters.page ?? 2,
  });

  return { payments: result.payments, total: result.total };
}

/** Every payment is its own row. Previous payments are never overwritten —
 *  except the pending placeholder the generator wrote, which becomes the
 *  payment when the money for that month actually arrives. */
export async function recordPaymentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const gate = await actionPermission("PAYMENTS");
  if ("denied" in gate) return gate.denied;
  const parsed = paymentFormSchema.safeParse({
    memberId: formData.get("memberId"),
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
  // The fee runs by the member's joining day, so the month is read from the
  // payment date rather than picked separately: paying on 8 October settles
  // October.
  const month = monthKeyFromInputDate(data.paymentDate);

  try {
    const member = await prisma.member.findUnique({
      where: { id: data.memberId },
      select: { id: true, name: true, joiningDate: true },
    });
    if (!member) {
      return errorState("That member no longer exists.", { memberId: "Select a member" });
    }

    const joinedMonth = joinedMonthKey(member.joiningDate);
    if (month < joinedMonth) {
      return errorState(
        `${member.name} joined in ${joinedMonth}, so an earlier month cannot be recorded.`,
        { paymentDate: "Date is before the joining date" },
      );
    }

    const paymentDate = parseInputDate(data.paymentDate);

    // The generator may already have written a pending placeholder for this
    // month. That row says "owed", not "paid", so it is turned into the
    // payment instead of leaving the month showing both a pending and a paid
    // row. A pending row a person wrote by hand is a real record and is left
    // alone.
    const placeholder = await prisma.payment.findFirst({
      where: {
        memberId: data.memberId,
        month,
        status: "PENDING",
        remarks: AUTO_PENDING_REMARK,
      },
      select: { id: true },
    });

    if (placeholder) {
      await prisma.payment.update({
        where: { id: placeholder.id },
        data: {
          amount: data.amount,
          paymentMode: data.paymentMode,
          paymentDate,
          status: data.status,
          remarks: data.remarks ?? null,
        },
      });
      await logMemberChange(prisma, {
        memberId: data.memberId,
        action: MEMBER_AUDIT_ACTIONS.PAYMENT_RECORDED,
        summary: `Payment recorded for ${month} (₹${data.amount})`,
        metadata: { month, amount: String(data.amount), paymentMode: data.paymentMode, status: data.status },
      });
    } else {
      const payment = await prisma.payment.create({
        data: {
          paymentId: await nextPaymentId(),
          memberId: data.memberId,
          month,
          amount: data.amount,
          paymentMode: data.paymentMode,
          paymentDate,
          status: data.status,
          remarks: data.remarks ?? null,
          receiptToken: newReceiptToken(),
        },
      });
      await logMemberChange(prisma, {
        memberId: data.memberId,
        action: MEMBER_AUDIT_ACTIONS.PAYMENT_RECORDED,
        summary: `Payment recorded for ${month} (₹${data.amount})`,
        metadata: { paymentId: payment.paymentId, month, amount: String(data.amount), paymentMode: data.paymentMode, status: data.status },
      });
    }

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
  const gate = await actionPermission("PAYMENTS");
  if ("denied" in gate) return gate.denied;
  const id = Number(formData.get("recordId"));
  if (!Number.isInteger(id) || id <= 0) return errorState("Payment not found.");

  const parsed = paymentFormSchema.safeParse({
    memberId: formData.get("memberId"),
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
      select: { id: true, memberId: true, month: true, amount: true, paymentMode: true, paymentDate: true, status: true, remarks: true, member: { select: { name: true } } },
    });
    if (!existing) return errorState("Payment not found.");

    const paymentDate = parseInputDate(parsed.data.paymentDate);
    const newMonth = monthKeyFromInputDate(parsed.data.paymentDate);

    await prisma.payment.update({
      where: { id },
      data: {
        memberId: parsed.data.memberId,
        // Moving a payment to another date moves it to that month.
        month: newMonth,
        amount: parsed.data.amount,
        paymentMode: parsed.data.paymentMode,
        paymentDate,
        status: parsed.data.status,
        remarks: parsed.data.remarks ?? null,
      },
    });

    const changes: MemberAuditChange[] = [];
    if (Number(existing.amount) !== Number(parsed.data.amount)) changes.push({ field: "amount", label: "Amount", old: String(existing.amount), new: String(parsed.data.amount) });
    if (existing.paymentMode !== parsed.data.paymentMode) changes.push({ field: "paymentMode", label: "Payment mode", old: existing.paymentMode, new: parsed.data.paymentMode });
    if (existing.status !== parsed.data.status) changes.push({ field: "status", label: "Status", old: existing.status, new: parsed.data.status });
    if (existing.month !== newMonth) changes.push({ field: "month", label: "Month", old: existing.month, new: newMonth });
    if ((existing.remarks || null) !== (parsed.data.remarks ?? null)) changes.push({ field: "remarks", label: "Remarks", old: existing.remarks, new: parsed.data.remarks ?? null });

    await logMemberChange(prisma, {
      memberId: parsed.data.memberId,
      action: MEMBER_AUDIT_ACTIONS.PAYMENT_EDITED,
      summary: `Payment edited for ${newMonth}`,
      changes,
      metadata: { paymentId: id, oldMemberId: existing.memberId, newMemberId: parsed.data.memberId },
    });

    revalidateAll();
    return successState(`Payment updated for ${existing.member.name}.`);
  } catch (error) {
    return errorState(prismaErrorMessage(error));
  }
}

/**
 * Removes one payment record for good.
 *
 * The record may be a receipt someone already holds a link to, so the row and
 * its receipt token go together; anyone opening the old receipt link after
 * this gets "not available". Editing is the reversible option; this one is not.
 */
export async function deletePaymentAction(recordId: number): Promise<ActionState> {
  const gate = await actionPermission("PAYMENTS");
  if ("denied" in gate) return gate.denied;
  if (!Number.isInteger(recordId) || recordId <= 0) return errorState("Payment not found.");

  try {
    const existing = await prisma.payment.findUnique({
      where: { id: recordId },
      select: {
        id: true,
        paymentId: true,
        month: true,
        memberId: true,
        amount: true,
        paymentMode: true,
        status: true,
        member: { select: { name: true } },
      },
    });
    if (!existing) return errorState("Payment not found.");

    await logMemberChange(prisma, {
      memberId: existing.memberId,
      action: MEMBER_AUDIT_ACTIONS.PAYMENT_DELETED,
      summary: `Payment deleted (${existing.paymentId}) for ${existing.month}`,
      metadata: { paymentId: existing.paymentId, month: existing.month, amount: String(existing.amount), paymentMode: existing.paymentMode, status: existing.status },
    });

    await prisma.payment.delete({ where: { id: recordId } });

    revalidateAll();
    return successState(
      `Deleted ${existing.paymentId} for ${existing.member.name} (${existing.month}).`,
    );
  } catch (error) {
    return errorState(prismaErrorMessage(error));
  }
}

/**
 * Creates one Pending row for every active member who owes the chosen month.
 *
 * The rows are placeholders, not money: they say "this month is owed". Two
 * rules keep them honest:
 *
 * - A member owes nothing before they joined, and their joining month is
 *   settled when they join, so the first month they can be pending for is the
 *   month after they joined.
 * - The row is dated on their joining day, so it says when the fee fell due
 *   rather than always the first of the month.
 *
 * Members who already have a record for the month are left alone.
 */
export async function generatePendingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const gate = await actionPermission("SETTINGS");
  if ("denied" in gate) return gate.denied;
  const parsed = monthKeySchema.safeParse(formData.get("month"));
  if (!parsed.success) {
    return errorState("Choose a valid month.", { month: "Choose a valid month" });
  }

  const month = parsed.data;
  const [standardFee, memberFees] = await Promise.all([
    getMonthlyFee(),
    memberFeesByMemberId(),
  ]);

  const members = await prisma.member.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      joiningDate: true,
      payments: { where: { month }, select: { id: true } },
    },
  });

  const missing = members.filter(
    (member) =>
      member.payments.length === 0 && firstPendingMonth(member.joiningDate) <= month,
  );

  if (missing.length === 0) {
    return errorState(
      "Nothing was added: every active member either already has a record for this month or joined during it.",
    );
  }

  const firstPaymentId = await nextPaymentId();
  await prisma.payment.createMany({
    data: missing.map((member, index) => ({
      paymentId: bumpPaymentId(firstPaymentId, index),
      memberId: member.id,
      month,
      amount: memberFees.get(member.id) ?? standardFee,
      paymentMode: "CASH" as const,
      paymentDate: pendingDueDate(month, member.joiningDate),
      status: "PENDING" as const,
      remarks: AUTO_PENDING_REMARK,
      receiptToken: newReceiptToken(),
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
  const gate = await actionPermission("SETTINGS");
  if ("denied" in gate) return gate.denied;

  const parsed = feeFormSchema.safeParse({ fee: formData.get("fee") });
  if (!parsed.success) {
    return errorState("Please check the fee amount.", fieldErrors(parsed.error));
  }
  await setMonthlyFee(parsed.data.fee);
  revalidateAll();
  return successState("Monthly fee updated.");
}

/**
 * Emails one paid month's receipt as a PDF attachment.
 *
 * The same PDF the download link serves, so email and WhatsApp carry an
 * identical receipt.
 */
export async function sendReceiptEmailAction(paymentPk: number): Promise<ActionState> {
  const gate = await actionPermission("PAYMENTS");
  if ("denied" in gate) return gate.denied;
  if (!Number.isInteger(paymentPk) || paymentPk <= 0) {
    return errorState("That receipt is not available.");
  }

  const context = await getReceiptContext(paymentPk);
  if (!context) return errorState("That receipt is not available.");

  if (!context.email) {
    return errorState(
      "No email on record for this member yet. Add one on the member's page, then try again.",
    );
  }

  if (!receiptEmailIsConfigured()) {
    return errorState(
      "Email is not set up yet. Add a Resend API key to start emailing receipts.",
    );
  }

  const result = await sendReceiptEmail(context.email, context.info);
  if (!result.ok) return errorState(result.error);

  return successState(`Receipt sent to ${context.email}.`);
}