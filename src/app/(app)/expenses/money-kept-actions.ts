"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { errorState, prismaErrorMessage, successState, type ActionState } from "@/lib/action-result";
import { prisma } from "@/lib/prisma";
import { nextMoneyKeptId } from "@/lib/ids";
import { requirePermission } from "@/lib/permissions";
import { parseInputDate } from "@/lib/format";

const moneyKeptSchema = z.object({
  date: z.string().trim().min(1, "Enter a date"),
  amount: z.coerce.number({ message: "Amount is required" }).positive("Amount must be greater than 0"),
  person: z.string().trim().min(1, "Enter person name"),
});

function revalidateAll() {
  revalidatePath("/expenses");
}

function parseFlexibleDate(input: string): Date {
  const s = input.trim();
  // Try MM/YYYY
  const mmyyyy = s.match(/^(\d{1,2})[\/\-](\d{4})$/);
  if (mmyyyy) {
    const month = parseInt(mmyyyy[1], 10);
    const year = parseInt(mmyyyy[2], 10);
    return new Date(year, month - 1, 1);
  }
  // Try DD/MM/YYYY
  const ddmmyyyy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (ddmmyyyy) {
    const day = parseInt(ddmmyyyy[1], 10);
    const month = parseInt(ddmmyyyy[2], 10);
    const year = parseInt(ddmmyyyy[3], 10);
    return new Date(year, month - 1, day);
  }
  // Try YYYY-MM
  const yymm = s.match(/^(\d{4})[\/\-](\d{1,2})$/);
  if (yymm) {
    const year = parseInt(yymm[1], 10);
    const month = parseInt(yymm[2], 10);
    return new Date(year, month - 1, 1);
  }
  // Fallback to existing parser
  return parseInputDate(s);
}

export async function createMoneyKeptAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requirePermission("EXPENSES");
  if (session.level !== "ADMIN" && !session.permissions?.includes("EXPENSES")) {
    return errorState("You do not have permission to add money kept.");
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

  try {
    await prisma.moneyKept.create({
      data: {
        moneyKeptId: await nextMoneyKeptId(),
        date: parseFlexibleDate(parsed.data.date),
        amount: parsed.data.amount,
        person: parsed.data.person,
        purpose: null,
        remarks: null,
      },
    });
    revalidateAll();
    return successState("Money kept added.");
  } catch (error) {
    return errorState(prismaErrorMessage(error));
  }
}
