"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { nextMemberId } from "@/lib/ids";

/**
 * Approves a pending application and, in the same transaction, creates the
 * member it points at. The member inherits the applicant's details so nothing
 * is re-typed, and the application record keeps its link to the member.
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

    const member = await prisma.$transaction(async (tx) => {
      const applicationData = await tx.application.findUniqueOrThrow({ where: { id } });
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
          seatId: null,
        },
        select: { id: true, memberId: true },
      });

      await tx.application.update({
        where: { id },
        data: { status: "APPROVED", memberId: member.id, decidedAt: new Date() },
      });

      return member;
    });

    revalidatePath("/applications");
    revalidatePath("/members");
    redirect(`/members/${member.id}?joined=1&from=application`);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect("/applications?error=failed");
  }
}

/** Marks an application rejected. Keeps every field so a later decision can still
 *  refer back to it. */
export async function rejectApplicationAction(formData: FormData): Promise<void> {
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) redirect("/applications?error=invalid");

  const updated = await prisma.application.updateMany({
    where: { id, status: "PENDING" },
    data: { status: "REJECTED", decidedAt: new Date() },
  });

  revalidatePath("/applications");
  if (updated.count === 0) redirect("/applications?error=gone");
}