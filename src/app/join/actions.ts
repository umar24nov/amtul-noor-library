"use server";

import { revalidatePath } from "next/cache";
import { errorState, prismaErrorMessage, successState, type ActionState } from "@/lib/action-result";
import { APPLICATION_RATE_LIMIT } from "@/lib/constants";
import { parseInputDate } from "@/lib/format";
import { getClientIp } from "@/lib/login-rate-limit";
import { prisma } from "@/lib/prisma";
import { storeAadhaarFile } from "@/lib/aadhaar-storage";
import { applicationSchema, fieldErrors } from "@/lib/validators";

/**
 * The join form is on the public site, so it defends itself: a hidden field
 * catches the bots that fill every input, an IP cannot apply more than a few
 * times a day, and a mobile or Aadhaar number cannot open a second application
 * while an earlier one is still open.
 */
export async function submitApplicationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  // Honeypot: browsers never show or fill "companyWebsite", so a value in it
  // proves an automated submitter. Answer politely and forget about it.
  if (String(formData.get("companyWebsite") ?? "").trim() !== "") {
    return successState("Application received. We will get back to you after reviewing it.");
  }

  const parsed = applicationSchema.safeParse({
    name: formData.get("name"),
    mobile: formData.get("mobile"),
    email: formData.get("email"),
    address: formData.get("address"),
    guardianName: formData.get("guardianName"),
    guardianMobile: formData.get("guardianMobile"),
    aadhaarNumber: formData.get("aadhaarNumber"),
    preparingFor: formData.get("preparingFor"),
    otherPreparation: formData.get("otherPreparation"),
    joiningDate: formData.get("joiningDate"),
    agreed: formData.get("agreed"),
  });

  if (!parsed.success) {
    return errorState("Please check the highlighted fields.", fieldErrors(parsed.error));
  }

  const data = parsed.data;
  const ip = await getClientIp();

  try {
    const since = new Date(Date.now() - APPLICATION_RATE_LIMIT.duplicateWindowDays * 24 * 60 * 60 * 1000);
    const [duplicate, countFromIp] = await Promise.all([
      prisma.application.findFirst({
        where: {
          createdAt: { gte: since },
          OR: [{ mobile: data.mobile }, { aadhaarNumber: data.aadhaarNumber }],
          status: { not: "REJECTED" },
        },
        select: { id: true },
      }),
      ip
        ? prisma.application.count({
            where: {
              ip,
              createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            },
          })
        : Promise.resolve(0),
    ]);

    if (duplicate) {
      return errorState(
        "An application with this mobile or Aadhaar number has already been submitted and is being reviewed.",
      );
    }
    if (countFromIp >= APPLICATION_RATE_LIMIT.perIpPerDay) {
      return errorState("Too many applications from this device today. Try again tomorrow.");
    }

    const front = formData.get("aadhaarFront");

    if (!(front instanceof File) || front.size === 0) {
      return errorState("Please attach a scan of your Aadhaar card.", {
        aadhaarFront: "Upload your Aadhaar card",
      });
    }

    const storedFront = await storeAadhaarFile(front, "front");
    if (storedFront.ok === false) {
      return errorState(storedFront.message, {
        aadhaarFront: storedFront.message,
      });
    }

    await prisma.application.create({
      data: {
        name: data.name,
        mobile: data.mobile,
        email: data.email ?? null,
        address: data.address ?? null,
        guardianName: data.guardianName ?? null,
        guardianMobile: data.guardianMobile ?? null,
        aadhaarNumber: data.aadhaarNumber,
        aadhaarFrontUrl: storedFront.ok ? storedFront.url : null,
        aadhaarBackUrl: null,
        preparingFor:
          data.preparingFor === "Other" && data.otherPreparation
            ? data.otherPreparation
            : data.preparingFor,
        otherPreparation:
          data.preparingFor === "Other" ? (data.otherPreparation ?? null) : null,
        desiredJoiningDate: parseInputDate(data.joiningDate),
        agreed: true,
        ip,
      },
    });

    revalidatePath("/applications");
    return successState("Application received. We will get back to you after reviewing it.");
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    return errorState(prismaErrorMessage(error));
  }
}