"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { errorState, prismaErrorMessage, successState, type ActionState } from "@/lib/action-result";
import { prisma } from "@/lib/prisma";
import { nextMoneyKeptId } from "@/lib/ids";
import { actionPermission } from "@/lib/permissions";
import { parseFlexibleDate } from "@/lib/flexible-date";

const moneyKeptSchema = z.object({
  date: z.string().trim().min(1, "Enter a date"),
  amount: z.coerce.number({ message: "Amount is required" }).positive("Amount must be greater than 0"),
  person: z.string().trim().min(1, "Enter person name"),
});

function revalidateAll() {
  revalidatePath("/expenses");
}

export async function createMoneyKeptAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await actionPermission("EXPENSES");
  if ("denied" in gate) return gate.denied;

  const parsed = moneyKeptSchema.safeParse({
    date: formData.get("date"),
    amount: formData.get("amount"),
    person: formData.get("person"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string") fieldErrors[key] = issue.message;
    }
    return errorState("Please check the highlighted fields.", fieldErrors);
  }

  const date = parseFlexibleDate(parsed.data.date);
  if (!date) {
    return errorState("Enter a valid date.", { date: "Enter a valid date" });
  }

  try {
    await prisma.moneyKept.create({
      data: {
        moneyKeptId: await nextMoneyKeptId(),
        date,
        dateLabel: parsed.data.date,
        amount: parsed.data.amount,
        person: parsed.data.person,
        purpose: null,
        remarks: null,
      } as Parameters<typeof prisma.moneyKept.create>[0]["data"],
    });
    revalidateAll();
    return successState("Money kept added.");
  } catch (error) {
    return errorState(prismaErrorMessage(error));
  }
}

export async function updateMoneyKeptAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await actionPermission("EXPENSES");
  if ("denied" in gate) return gate.denied;

  const moneyKeptPk = Number(formData.get("moneyKeptPk"));
  if (!Number.isFinite(moneyKeptPk)) {
    return errorState("Invalid entry.");
  }

  const parsed = moneyKeptSchema.safeParse({
    date: formData.get("date"),
    amount: formData.get("amount"),
    person: formData.get("person"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string") fieldErrors[key] = issue.message;
    }
    return errorState("Please check the highlighted fields.", fieldErrors);
  }

  const date = parseFlexibleDate(parsed.data.date);
  if (!date) {
    return errorState("Enter a valid date.", { date: "Enter a valid date" });
  }

  try {
    await prisma.moneyKept.update({
      where: { id: moneyKeptPk },
      data: {
        date,
        dateLabel: parsed.data.date,
        amount: parsed.data.amount,
        person: parsed.data.person,
      } as Parameters<typeof prisma.moneyKept.update>[0]["data"],
    });
    revalidateAll();
    return successState("Money kept updated.");
  } catch (error) {
    return errorState(prismaErrorMessage(error));
  }
}

export async function deleteMoneyKeptAction(moneyKeptPk: number): Promise<ActionState> {
  const gate = await actionPermission("EXPENSES");
  if ("denied" in gate) return gate.denied;

  if (!Number.isFinite(moneyKeptPk)) {
    return errorState("Invalid entry.");
  }

  try {
    await prisma.moneyKept.delete({ where: { id: moneyKeptPk } });
    revalidateAll();
    return successState("Money kept deleted.");
  } catch (error) {
    return errorState(prismaErrorMessage(error));
  }
}
