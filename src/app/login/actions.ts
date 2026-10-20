"use server";

import { redirect } from "next/navigation";
import { createSession, destroySession, getSession, verifyCredentials } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { errorState, type ActionState } from "@/lib/action-result";
import {
  checkLoginRateLimit,
  clearLoginFailures,
  getClientIp,
  recordFailedLogin,
} from "@/lib/login-rate-limit";
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

  const ip = await getClientIp();
  const limit = await checkLoginRateLimit(parsed.data.email, ip);
  if (limit.limited) {
    return errorState(
      `Too many failed attempts. Try again in ${limit.retryAfterMinutes} minute${
        limit.retryAfterMinutes === 1 ? "" : "s"
      }.`,
    );
  }

  const session = await verifyCredentials(parsed.data.email, parsed.data.password);
  if (!session) {
    await recordFailedLogin(parsed.data.email, ip);
    return errorState("Email or password is incorrect.");
  }

  await clearLoginFailures(parsed.data.email);
  await createSession(session);
  await logActivity("LOGIN", { id: session.userId, email: session.email });
  redirect(safeNext(parsed.data.next));
}

export async function logoutAction(): Promise<void> {
  // Read the session before it is cleared so the log can name who left.
  const session = await getSession();
  if (session) {
    await logActivity("LOGOUT", { id: session.userId, email: session.email });
  }
  await destroySession();
  redirect("/login");
}