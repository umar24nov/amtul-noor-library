"use server";

import { redirect } from "next/navigation";
import { createSession, destroySession, verifyCredentials } from "@/lib/auth";
import { errorState, type ActionState } from "@/lib/action-result";
import { fieldErrors, loginSchema } from "@/lib/validators";

function safeNext(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }
  return value;
}

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next"),
  });

  if (!parsed.success) {
    return errorState("Please check the highlighted fields.", fieldErrors(parsed.error));
  }

  const session = await verifyCredentials(parsed.data.email, parsed.data.password);
  if (!session) {
    return errorState("Email or password is incorrect.");
  }

  await createSession(session);
  redirect(safeNext(parsed.data.next));
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}