"use server";

import { revalidatePath } from "next/cache";
import {
  errorState,
  prismaErrorMessage,
  successState,
  type ActionState,
} from "@/lib/action-result";
import { sendApplicationDecisionEmail } from "@/lib/application-email";
import { actionPermission } from "@/lib/permissions";
import { normalizeSeatNumber, parseInputDate } from "@/lib/format";
import { nextMemberId, newPayToken } from "@/lib/ids";
import { monthlyFeeForSeat, seatHasLocker } from "@/lib/constants";
import { memberFeeKey } from "@/lib/settings";
import { logMemberChange, MEMBER_AUDIT_ACTIONS } from "@/lib/member-audit";
import { prisma } from "@/lib/prisma";
import { siteOrigin } from "@/lib/site";
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
 * is re-typed, and the application record keeps its link to the member.
 *
 * The welcome is attempted exactly once, immediately after that transaction.
 * The atomic status claim means only one overlapping approval can win and send
 * it. A delivery failure never undoes the approval and is never retried; the
 * flag is set only when the message actually went out, and there is no manual
 * send path for an approved application.
 */
export async function approveApplicationAction(formData: FormData): Promise<ActionState> {
  const gate = await actionPermission("APPLICATIONS");
  if ("denied" in gate) return gate.denied;

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return errorState("That application request was invalid.");

  try {
    const application = await prisma.application.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!application || application.status !== "PENDING") {
      return errorState("This application has already been decided or is no longer available.");
    }

    const result = await prisma.$transaction(async (tx) => {
      const applicationData = await tx.application.findUniqueOrThrow({
        where: { id },
      });

      // Claim the decision before doing any work. The status condition makes the
      // claim atomic: two overlapping approvals cannot both win, and a losing
      // request creates no member and sends no email. A later failure rolls the
      // whole claim back with the transaction. The welcome flag is deliberately
      // not set here — it records a delivered message, not an attempt.
      const claim = await tx.application.updateMany({
        where: { id, status: "PENDING" },
        data: { status: "APPROVED", decidedAt: new Date() },
      });
      if (claim.count !== 1) return { alreadyDecided: true as const };

      // Honour the seat the applicant asked for, but only if it is still free;
      // otherwise the member is created without one and the owner assigns it.
      let seatId: number | null = null;
      let seatLabel: string | null = null;
      let lockerSeat = false;
      if (applicationData.preferredSeatId) {
        const seat = await tx.seat.findUnique({
          where: { id: applicationData.preferredSeatId },
          select: {
            id: true,
            status: true,
            seatNumber: true,
          },
        });
        if (seat && seat.status === "AVAILABLE") {
          seatId = seat.id;
          lockerSeat = seatHasLocker(seat.seatNumber);
          seatLabel = `Seat ${normalizeSeatNumber(seat.seatNumber)}${lockerSeat ? " (with locker)" : ""}`;
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

      await logMemberChange(tx, {
        memberId: member.id,
        action: MEMBER_AUDIT_ACTIONS.MEMBER_CREATED,
        summary: "Member created from an approved application",
        metadata: { channel: "Application", memberCode: member.memberId },
      });

      if (seatId !== null) {
        await tx.seat.update({ where: { id: seatId }, data: { status: "OCCUPIED" } });
        // The seat the applicant chose decides their fee: ₹800 with a locker,
        // ₹700 without. No payments exist yet, so no rows need re-pricing.
        const fee = monthlyFeeForSeat(lockerSeat);
        await tx.setting.upsert({
          where: { key: memberFeeKey(member.id) },
          update: { value: String(fee) },
          create: { key: memberFeeKey(member.id), value: String(fee) },
        });
      }

      await tx.application.update({
        where: { id },
        data: { memberId: member.id },
      });

      return {
        alreadyDecided: false as const,
        member,
        email: applicationData.email,
        applicantName: applicationData.name,
        seatLabel,
      };
    });

    if (result.alreadyDecided) {
      return errorState("This application has already been decided or is no longer available.");
    }

    let emailStatus = "none";
    if (result.email) {
      const email = await sendApplicationDecisionEmail({
        to: result.email,
        applicantName: result.applicantName,
        approved: true,
        seatLabel: result.seatLabel,
        memberId: result.member.memberId,
        memberLoginUrl: `${await siteOrigin()}/member`,
      });
      emailStatus = email.ok ? "sent" : "failed";
      if (email.ok) {
        // Record delivery, not the attempt. There is no manual approved send
        // path, so a failed message is never retried and this flag cannot be
        // used to produce a second welcome.
        await prisma.application.updateMany({
          where: { id, status: "APPROVED" },
          data: { welcomeEmailSentAt: new Date() },
        });
      }
    }

    revalidateAll();
    return successState(
      "Application approved. Member created.",
      undefined,
      `/members/${result.member.id}?joined=1&email=${emailStatus}`,
    );
  } catch (error) {
    return errorState(prismaErrorMessage(error));
  }
}

/**
 * Marks an application rejected. Every field is kept so a later decision can
 * still refer back to it. The owner may write a reason, which is stored, shown
 * on the card, and included in the email to the applicant.
 */
export async function rejectApplicationAction(formData: FormData): Promise<ActionState> {
  const gate = await actionPermission("APPLICATIONS");
  if ("denied" in gate) return gate.denied;
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
      const email = await sendApplicationDecisionEmail({
        to: application.email,
        applicantName: application.name,
        approved: false,
        reason,
      });
      revalidateAll();
      return successState(
        email.ok
          ? `Application rejected. Email sent to ${application.email}.`
          : `Application rejected, but the email could not be sent: ${email.error}`,
      );
    }

    revalidateAll();
    return successState("Application rejected. No email address was on file.");
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
  const gate = await actionPermission("APPLICATIONS");
  if ("denied" in gate) return gate.denied;
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
 * Sends a rejection decision email by hand when the automatic send failed.
 *
 * The welcome is different: it is attempted exactly once during approval and
 * is never retried, so this action refuses approved applications. A rejection
 * email is not a welcome and may be sent again; unlike the automatic path, this
 * reports exactly what went wrong.
 */
export async function sendApplicationEmailAction(applicationId: number): Promise<ActionState> {
  const gate = await actionPermission("APPLICATIONS");
  if ("denied" in gate) return gate.denied;
  if (!Number.isInteger(applicationId) || applicationId <= 0) {
    return errorState("Application not found.");
  }

  try {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      select: {
        id: true,
        status: true,
        email: true,
        name: true,
        rejectionReason: true,
      },
    });
    if (!application) return errorState("Application not found.");
    if (application.status === "PENDING") {
      return errorState("Approve or reject the application before emailing the applicant.");
    }
    if (!application.email) {
      return errorState("This application has no email address on file.");
    }

    if (application.status === "APPROVED") {
      return errorState(
        "The welcome email is sent once when the application is approved and is not sent again.",
      );
    }

    const result = await sendApplicationDecisionEmail({
      to: application.email,
      applicantName: application.name,
      approved: false,
      reason: application.rejectionReason,
    });

    if (!result.ok) return errorState(result.error);

    return successState(`Email sent to ${application.email}.`);
  } catch (error) {
    return errorState(prismaErrorMessage(error));
  }
}

/**
 * Frees the seat held by an approved application's member, without deleting
 * anything.
 *
 * This is for the member who studies for a while and then leaves: the seat goes
 * back into the pool so it can be booked again, the member is marked as left
 * (their payments and personal record are kept, and they drop off the active
 * list), and the application stays on this page as the paper trail. Nothing is
 * lost — only the seat is released.
 */
export async function releaseApplicationSeatAction(id: number): Promise<ActionState> {
  const gate = await actionPermission("APPLICATIONS");
  if ("denied" in gate) return gate.denied;
  if (!Number.isInteger(id) || id <= 0) return errorState("Application not found.");

  try {
    const application = await prisma.application.findUnique({
      where: { id },
      select: { id: true, member: { select: { id: true, seatId: true } } },
    });
    if (!application) return errorState("Application not found.");

    const member = application.member;
    if (!member) {
      return errorState("This application has no member, so there is no seat to release.");
    }
    if (!member.seatId) {
      return errorState("This member's seat is already free.");
    }

    const seatId = member.seatId;
    await prisma.$transaction(async (tx) => {
      await tx.member.update({
        where: { id: member.id },
        data: { status: "LEFT", leavingDate: new Date(), seatId: null },
      });
      await tx.seat.update({ where: { id: seatId }, data: { status: "AVAILABLE" } });
    });

    revalidateAll();
    return successState("Seat released. The member is marked as left and their records are kept.");
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
  const gate = await actionPermission("APPLICATIONS");
  if ("denied" in gate) return gate.denied;
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
