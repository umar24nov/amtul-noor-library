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
  if (!s) {
    return new Date();
  }
  try {
    const mmyyyy = s.match(/^(\d{1,2})[\/\-](\d{4})$/);
    if (mmyyyy) {
      const month = parseInt(mmyyyy[1], 10);
      const year = parseInt(mmyyyy[2], 10);
      if (month >= 1 && month <= 12) {
        return new Date(year, month - 1, 1);
      }
    }
    const ddmmyyyy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (ddmmyyyy) {
      const day = parseInt(ddmmyyyy[1], 10);
      const month = parseInt(ddmmyyyy[2], 10);
      const year = parseInt(ddmmyyyy[3], 10);
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return new Date(year, month - 1, day);
      }
    }
    const yymm = s.match(/^(\d{4})[\/\-](\d{1,2})$/);
    if (yymm) {
      const year = parseInt(yymm[1], 10);
      const month = parseInt(yymm[2], 10);
      if (month >= 1 && month <= 12) {
        return new Date(year, month - 1, 1);
      }
    }
    const dMonY = s.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})$/);
    if (dMonY) {
      const day = parseInt(dMonY[1], 10);
      const monthName = dMonY[2].toLowerCase();
      const year = parseInt(dMonY[3], 10);
      const months: Record<string, number> = {
        jan: 0, january: 0,
        feb: 1, february: 1,
        mar: 2, march: 2,
        apr: 3, april: 3,
        may: 4,
        jun: 5, june: 5,
        jul: 6, july: 6,
        aug: 7, august: 7,
        sep: 8, sept: 8, september: 8,
        oct: 9, october: 9,
        nov: 10, november: 10,
        dec: 11, december: 11,
      };
      const m = months[monthName.slice(0,3)];
      if (m !== undefined && day >= 1 && day <= 31) {
        return new Date(year, m, day);
      }
    }
    // Try native parse as last resort
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  } catch {
    // ignore
  }
  return new Date();
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

export async function updateMoneyKeptAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requirePermission("EXPENSES");
  if (session.level !== "ADMIN" && !session.permissions?.includes("EXPENSES")) {
    return errorState("You do not have permission to edit money kept.");
  }

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

  try {
    await prisma.moneyKept.update({
      where: { id: moneyKeptPk },
      data: {
        date: parseFlexibleDate(parsed.data.date),
        amount: parsed.data.amount,
        person: parsed.data.person,
      },
    });
    revalidateAll();
    return successState("Money kept updated.");
  } catch (error) {
    return errorState(prismaErrorMessage(error));
  }
}

export async function deleteMoneyKeptAction(moneyKeptPk: number): Promise<ActionState> {
  const session = await requirePermission("EXPENSES");
  if (session.level !== "ADMIN" && !session.permissions?.includes("EXPENSES")) {
    return errorState("You do not have permission to delete money kept.");
  }

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
