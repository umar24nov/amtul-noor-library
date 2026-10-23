"use server";

import { revalidatePath } from "next/cache";
import { errorState, prismaErrorMessage, successState, type ActionState } from "@/lib/action-result";
import { actionPermission } from "@/lib/permissions";
import { parseInputDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { nextExpenseId } from "@/lib/ids";
import { expenseFormSchema } from "@/lib/expense-validators";

function fieldErrors(err: import("zod").ZodError) {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !out[key]) out[key] = issue.message;
  }
  return out;
}

function revalidateAll() {
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
}

export async function createExpenseAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const gate = await actionPermission("EXPENSES");
  if ("denied" in gate) return gate.denied;

  const parsed = expenseFormSchema.safeParse({
    date: formData.get("date"),
    amount: formData.get("amount"),
    purpose: formData.get("purpose"),
    category: formData.get("category"),
    paidTo: formData.get("paidTo"),
    remarks: formData.get("remarks"),
  });

  if (!parsed.success) {
    return errorState("Please check the highlighted fields.", fieldErrors(parsed.error));
  }

  try {
    await prisma.expense.create({
      data: {
        expenseId: await nextExpenseId(),
        date: parseInputDate(parsed.data.date),
        amount: parsed.data.amount,
        purpose: parsed.data.purpose,
        category: parsed.data.category || null,
        paidTo: parsed.data.paidTo || null,
        remarks: parsed.data.remarks || null,
      },
    });

    revalidateAll();
    return successState("Expense added.");
  } catch (error) {
    return errorState(prismaErrorMessage(error));
  }
}

export async function updateExpenseAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const gate = await actionPermission("EXPENSES");
  if ("denied" in gate) return gate.denied;

  const id = Number(formData.get("expensePk"));
  if (!Number.isInteger(id) || id <= 0) return errorState("Expense not found.");

  const parsed = expenseFormSchema.safeParse({
    date: formData.get("date"),
    amount: formData.get("amount"),
    purpose: formData.get("purpose"),
    category: formData.get("category"),
    paidTo: formData.get("paidTo"),
    remarks: formData.get("remarks"),
  });

  if (!parsed.success) {
    return errorState("Please check the highlighted fields.", fieldErrors(parsed.error));
  }

  try {
    const existing = await prisma.expense.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return errorState("Expense not found.");

    await prisma.expense.update({
      where: { id },
      data: {
        date: parseInputDate(parsed.data.date),
        amount: parsed.data.amount,
        purpose: parsed.data.purpose,
        category: parsed.data.category || null,
        paidTo: parsed.data.paidTo || null,
        remarks: parsed.data.remarks || null,
      },
    });

    revalidateAll();
    return successState("Expense updated.");
  } catch (error) {
    return errorState(prismaErrorMessage(error));
  }
}

export async function deleteExpenseAction(expensePk: number): Promise<ActionState> {
  const gate = await actionPermission("EXPENSES");
  if ("denied" in gate) return gate.denied;
  if (!Number.isInteger(expensePk) || expensePk <= 0) return errorState("Expense not found.");

  try {
    await prisma.expense.delete({ where: { id: expensePk } });
    revalidateAll();
    return successState("Expense deleted.");
  } catch (error) {
    return errorState(prismaErrorMessage(error));
  }
}
