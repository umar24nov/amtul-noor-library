"use server";

import { revalidatePath } from "next/cache";
import {
  errorState,
  prismaErrorMessage,
  successState,
  type ActionState,
} from "@/lib/action-result";
import { ordinalDay } from "@/lib/format";
import { setMonthlyFeeDueDay } from "@/lib/settings";
import { dueDayFormSchema, fieldErrors } from "@/lib/validators";

export async function updateFeeDueDayAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = dueDayFormSchema.safeParse({ dueDay: formData.get("dueDay") });
  if (!parsed.success) {
    return errorState("Please check the day of the month.", fieldErrors(parsed.error));
  }

  try {
    await setMonthlyFeeDueDay(parsed.data.dueDay);
  } catch (error) {
    return errorState(prismaErrorMessage(error));
  }

  // The due day shows on the dashboard, and the day count on it depends on it,
  // so everything that renders a month has to be re-read.
  revalidatePath("/dashboard");
  revalidatePath("/payments");
  revalidatePath("/members");

  const { dueDay } = parsed.data;
  return successState(`Fee now due on the ${ordinalDay(dueDay)} of every month.`);
}