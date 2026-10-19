"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  errorState,
  prismaErrorMessage,
  successState,
  type ActionState,
} from "@/lib/action-result";
import { sendApplicationDecisionEmail } from "@/lib/application-email";
import { parseInputDate } from "@/lib/format";
import { nextMemberId, newPayToken } from "@/lib/ids";
import { prisma } from "@/lib/prisma";
import { applicationEditSchema, fieldErrors } from "@/lib/validators";

function revalidateAll() {
  revalidatePath("/applications");
  revalidatePath("/members");
  revalidatePath("/seats");
  revalidatePath("/payments");
  revalidatePath("/dashboard");
  revalidatePath("/");
}

/**
 * Approves a pending application and, in the same transaction, creates the
 * member it points at. The member inherits the applicant's details so nothing
 * is re-typed, and the application record keeps its link to the member. A
 * welcome email goes out afterwards; a mail failure never undoes the approval.
 */
export async function approveApplicationAction(formData: FormData): Promise<void> {
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) redirect("/applications?error=invalid");

  try {
    const application = await prisma.application.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!application || application.status !== "PENDING") {
      redirect("/applications?error=gone");
    }

    const result = await prisma.$transaction(async (tx) => {
      const applicationData = await tx.application.findUniqueOrThrow({
        where: { id },
        include: { preferredSeat: { include: { room: true } } },
      });

      // Honour the seat the applicant asked for, but only if it is still free;
      // otherwise the member is created without one and the owner assigns it.
      let seatId: number | null = null;
      let seatLabel: string | null = null;
      if (applicationData.preferredSeatId) {
        const seat = await tx.seat.findUnique({
          where: { id: applicationData.preferredSeatId },
          select: { id: true, status: true, seatNumber: true, room: { select: { name: true } } },
        });
        if (seat && seat.status === "AVAILABLE") {
          seatId = seat.id;
          seatLabel = `${seat.room.name} · Seat ${seat.seatNumber}`;
        }
      }

      const member = await tx.member.create({
        data: {
          memberId: await nextMemberId(tx),
          name: applicationData.name,
          mobile: applicationData.mobile,
          email: applicationData.email ?? null,
          guardianName: applicationData.guardianName ?? null,
          guardianMobile: applicationData.guardianMobile ?? null,
          joiningDate: applicationData.desiredJoiningDate,
          remarks: "Approved from an online application",
          status: "ACTIVE",
          seatId,
          payToken: newPayToken(),
        },
        select: { id: true, memberId: true },
      });

      if (seatId !== null) {
        await tx.seat.update({ where: { id: seatId }, data: { status: "OCCUPIED" } });
      }

      await tx.application.update({
        where: { id },
        data: { status: "APPROVED", memberId: member.id, decidedAt: new Date() },
      });

      return {
        member,
        email: applicationData.email,
        applicantName: applicationData.name,
        seatLabel,
      };
    });

    if (result.email) {
      await sendApplicationDecisionEmail({
        to: result.email,
        applicantName: result.applicantName,
        approved: true,
        seatLabel: result.seatLabel,
      }).catch(() => undefined);
    }

    revalidateAll();
    redirect(`/members/${result.member.id}?joined=1&from=application`);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect("/applications?error=failed");
  }
}

/**
 * Marks an application rejected. Every field is kept so a later decision can
 * still refer back to it. The owner may write a reason, which is stored, shown
 * on the card, and included in the email to the applicant.
 */
export async function rejectApplicationAction(formData: FormData): Promise<ActionState> {
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return errorState("Application not found.");

  const reasonValue = formData.get("reason");
  const reason =
    typeof reasonValue === "string" && reasonValue.trim() ? reasonValue.trim().slice(0, 500) : null;

  try {
    const application = await prisma.application.findUnique({
      where: { id },
      select: { id: true, status: true, email: true, name: true },
    });
    if (!application || application.status !== "PENDING") {
      return errorState("This application has already been decided.");
    }

    await prisma.application.update({
      where: { id },
      data: { status: "REJECTED", decidedAt: new Date(), rejectionReason: reason },
    });

    if (application.email) {
      await sendApplicationDecisionEmail({
        to: application.email,
        applicantName: application.name,
        approved: false,
        reason,
      }).catch(() => undefined);
    }

    revalidateAll();
    return successState("Application rejected.");
  } catch (error) {
    return errorState(prismaErrorMessage(error));
  }
}

/**
 * Updates the fields the owner is allowed to correct. When the application has
 * already produced a member, the shared personal details are copied across so
 * the two records cannot drift apart.
 */
export async function updateApplicationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return errorState("Application not found.");

  const parsed = applicationEditSchema.safeParse({
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
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return errorState("Please check the highlighted fields.", fieldErrors(parsed.error));
  }

  const data = parsed.data;

  try {
    const application = await prisma.application.findUnique({
      where: { id },
      select: { id: true, memberId: true },
    });
    if (!application) return errorState("Application not found.");

    await prisma.$transaction(async (tx) => {
      await tx.application.update({
        where: { id },
        data: {
          name: data.name,
          mobile: data.mobile,
          email: data.email ?? null,
          address: data.address ?? null,
          guardianName: data.guardianName ?? null,
          guardianMobile: data.guardianMobile ?? null,
          aadhaarNumber: data.aadhaarNumber,
          preparingFor: data.preparingFor,
          otherPreparation: data.otherPreparation ?? null,
          desiredJoiningDate: parseInputDate(data.joiningDate),
          notes: data.notes ?? null,
        },
      });

      if (application.memberId) {
        await tx.member.update({
          where: { id: application.memberId },
          data: {
            name: data.name,
            mobile: data.mobile,
            email: data.email ?? null,
            guardianName: data.guardianName ?? null,
            guardianMobile: data.guardianMobile ?? null,
          },
        });
      }
    });

    revalidateAll();
    return successState("Application updated.");
  } catch (error) {
    return errorState(prismaErrorMessage(error));
  }
}

/**
 * Deletes an application for good.
 *
 * When it was approved, the member it created is kept but marked as having
 * left: their seat is released so it can be taken again, they drop off the
 * active members list, and — crucially — their payment history stays. Deleting
 * the member would cascade away every payment they ever made, which would
 * change the library's collected totals for past months. Pending or rejected
 * applications simply disappear.
 */
export async function deleteApplicationAction(id: number): Promise<ActionState> {
  if (!Number.isInteger(id) || id <= 0) return errorState("Application not found.");

  try {
    const application = await prisma.application.findUnique({
      where: { id },
      select: { id: true, memberId: true },
    });
    if (!application) return errorState("Application not found.");

    await prisma.$transaction(async (tx) => {
      if (application.memberId) {
        const member = await tx.member.findUnique({
          where: { id: application.memberId },
          select: { id: true, seatId: true },
        });

        if (member) {
          // Keep the member and their payments; just release the seat and take
          // them off the active list.
          await tx.member.update({
            where: { id: member.id },
            data: { status: "LEFT", leavingDate: new Date(), seatId: null },
          });

          if (member.seatId) {
            await tx.seat.update({
              where: { id: member.seatId },
              data: { status: "AVAILABLE" },
            });
          }
        }
      }

      await tx.application.delete({ where: { id } });
    });

    revalidateAll();
    return successState("Application deleted. Their seat is free again and past payments are kept.");
  } catch (error) {
    return errorState(prismaErrorMessage(error));
  }
}
