"use server";

import {
  errorState,
  prismaErrorMessage,
  successState,
  type ActionState,
} from "@/lib/action-result";
import { SUPPORT_RATE_LIMIT } from "@/lib/constants";
import { getClientIp } from "@/lib/login-rate-limit";
import { prisma } from "@/lib/prisma";
import { sendSupportEmail } from "@/lib/support-email";
import { fieldErrors, supportMessageSchema } from "@/lib/validators";

/**
 * The public help & support form.
 *
 * It defends itself the same way the join form does: a hidden field catches the
 * bots that fill every input, and one IP cannot send more than a few messages a
 * day. The message is written to the database first, so it survives even if the
 * notification email to the owner cannot be sent.
 */
export async function submitSupportMessageAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  // Honeypot: browsers never show or fill "companyWebsite", so a value in it
  // proves an automated submitter. Answer politely and forget about it.
  if (String(formData.get("companyWebsite") ?? "").trim() !== "") {
    return successState("Thanks — your message has reached us.");
  }

  const parsed = supportMessageSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    topic: formData.get("topic"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    return errorState("Please check the highlighted fields.", fieldErrors(parsed.error));
  }

  const data = parsed.data;
  const ip = await getClientIp();

  try {
    if (ip) {
      const countFromIp = await prisma.supportMessage.count({
        where: {
          ip,
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      });
      if (countFromIp >= SUPPORT_RATE_LIMIT.perIpPerDay) {
        return errorState(
          "You have sent us several messages today. Please try again tomorrow, or call the library.",
        );
      }
    }

    await prisma.supportMessage.create({
      data: {
        name: data.name,
        email: data.email,
        topic: data.topic,
        message: data.message,
        ip,
      },
    });

    // The message is safely stored; emailing the owner is a courtesy on top.
    const emailed = await sendSupportEmail(data);
    if (!emailed.ok) {
      console.error(`support message saved but the notification email failed: ${emailed.error}`);
    }

    return successState("Thanks — your message has reached us. We will reply by email.");
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    return errorState(prismaErrorMessage(error));
  }
}
