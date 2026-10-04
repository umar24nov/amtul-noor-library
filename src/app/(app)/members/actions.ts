"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { errorState, prismaErrorMessage, successState, type ActionState } from "@/lib/action-result";
import { parseInputDate } from "@/lib/format";
import { nextMemberId, nextPaymentId } from "@/lib/ids";
import { memberFormSchema, fieldErrors, markLeftSchema } from "@/lib/validators";
import { prisma } from "@/lib/prisma";
import { listMembers } from "@/lib/queries";
import { DEFAULT_MEMBER_SORT, isMemberSort } from "@/lib/constants";

function revalidateAll() {
  revalidatePath("/dashboard");
  revalidatePath("/members");
  revalidatePath("/payments");
  revalidatePath("/seats");
}

/**
 * Returns the next batch of rows for the scrolling members list.
 *
 * Read-only, and it goes through the same listMembers query as the page so a
 * batch that arrives by scrolling cannot disagree with a full page load.
 */
export async function loadMoreMembersAction(filters: {
  q?: string;
  status?: string;
  room?: string;
  sort?: string;
  page?: number;
}) {
  const roomId = Number(filters.room);
  const result = await listMembers({
    search: filters.q,
    status: filters.status === "ACTIVE" || filters.status === "LEFT" ? filters.status : "ALL",
    room:
      filters.room === "NONE"
        ? "NONE"
        : Number.isInteger(roomId) && roomId > 0
          ? roomId
          : undefined,
    sort: isMemberSort(filters.sort) ? filters.sort : DEFAULT_MEMBER_SORT,
    page: filters.page ?? 2,
  });

  return { members: result.members, total: result.total };
}

function readSeatId(formData: FormData): string | undefined {
  const raw = formData.get("seatId");
  const value = typeof raw === "string" ? raw.trim() : "";
  return value ? value : undefined;
}

/**
 * Joining a member is one transaction: member record, seat assignment and the
 * initial payment. Nothing else has to be re-entered by staff.
 */
export async function createMemberAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = memberFormSchema.safeParse({
    name: formData.get("name"),
    mobile: formData.get("mobile"),
    guardianName: formData.get("guardianName"),
    guardianMobile: formData.get("guardianMobile"),
    joiningDate: formData.get("joiningDate"),
    remarks: formData.get("remarks"),
    seatId: readSeatId(formData),
    payAmount: formData.get("payAmount"),
    payMode: formData.get("payMode"),
    payMonth: formData.get("payMonth"),
    payDate: formData.get("payDate"),
  });

  if (!parsed.success) {
    return errorState("Please check the highlighted fields.", fieldErrors(parsed.error));
  }

  const data = parsed.data;
  const wantsPayment = data.payAmount !== undefined && data.payMode !== undefined;
  if (wantsPayment && (!data.payMonth || !data.payDate)) {
    return errorState("Please check the highlighted fields.", {
      payMonth: "Choose the month this payment is for",
      payDate: "Payment date is required",
    });
  }

  try {
    const seatId = data.seatId;

    if (seatId) {
      const seat = await prisma.seat.findUnique({
        where: { id: seatId },
        include: { occupants: { where: { status: "ACTIVE" }, select: { id: true } } },
      });
      if (!seat) {
        return errorState("That seat no longer exists. Pick another seat.", { seatId: "Seat not found" });
      }
      if (seat.occupants.length > 0) {
        return errorState("That seat is already occupied.", { seatId: "Seat is already occupied" });
      }
    }

    const member = await prisma.$transaction(async (tx) => {
      const memberId = await nextMemberId(tx);

      const created = await tx.member.create({
        data: {
          memberId,
          name: data.name,
          mobile: data.mobile,
          guardianName: data.guardianName ?? null,
          guardianMobile: data.guardianMobile ?? null,
          joiningDate: parseInputDate(data.joiningDate),
          remarks: data.remarks ?? null,
          status: "ACTIVE",
          seatId: seatId ?? null,
        },
        select: { id: true, memberId: true },
      });

      if (seatId) {
        await tx.seat.update({ where: { id: seatId }, data: { status: "OCCUPIED" } });
      }

      if (wantsPayment) {
        const paymentId = await nextPaymentId(tx);
        await tx.payment.create({
          data: {
            paymentId,
            memberId: created.id,
            month: data.payMonth as string,
            amount: data.payAmount as number,
            paymentMode: data.payMode as "CASH" | "ONLINE" | "OFFER",
            paymentDate: parseInputDate(data.payDate as string),
            status: "PAID",
            remarks: "Initial payment on joining",
          },
        });
      }

      return created;
    });

    revalidateAll();
    redirect(`/members/${member.id}?joined=1`);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    return errorState(prismaErrorMessage(error));
  }
}

export async function updateMemberAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = memberFormSchema.safeParse({
    name: formData.get("name"),
    mobile: formData.get("mobile"),
    guardianName: formData.get("guardianName"),
    guardianMobile: formData.get("guardianMobile"),
    joiningDate: formData.get("joiningDate"),
    remarks: formData.get("remarks"),
    seatId: readSeatId(formData),
  });

  if (!parsed.success) {
    return errorState("Please check the highlighted fields.", fieldErrors(parsed.error));
  }

  // The form submits the public member code (ATN001), not the database id.
  const memberCode = String(formData.get("memberId") ?? "")
    .trim()
    .toUpperCase();
  if (!memberCode) return errorState("Member not found.");

  const data = parsed.data;

  try {
    const existing = await prisma.member.findUnique({
      where: { memberId: memberCode },
      select: { id: true, seatId: true, status: true },
    });
    if (!existing) return errorState("Member not found.");

    const seatId = data.seatId ?? null;

    if (seatId && seatId !== existing.seatId) {
      const seat = await prisma.seat.findUnique({
        where: { id: seatId },
        include: { occupants: { where: { status: "ACTIVE" }, select: { id: true } } },
      });
      if (!seat) {
        return errorState("That seat no longer exists. Pick another seat.", { seatId: "Seat not found" });
      }
      if (seat.occupants.some((occupant) => occupant.id !== existing.id)) {
        return errorState("That seat is already occupied.", { seatId: "Seat is already occupied" });
      }
      if (existing.status === "ACTIVE") {
        const otherSeat = await prisma.member.findFirst({
          where: { id: { not: existing.id }, status: "ACTIVE", seatId },
          select: { id: true },
        });
        if (otherSeat) {
          return errorState("That seat is already assigned to another active member.", {
            seatId: "Seat is already assigned",
          });
        }
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.member.update({
        where: { id: existing.id },
        data: {
          name: data.name,
          mobile: data.mobile,
          guardianName: data.guardianName ?? null,
          guardianMobile: data.guardianMobile ?? null,
          joiningDate: parseInputDate(data.joiningDate),
          remarks: data.remarks ?? null,
          seatId: existing.status === "ACTIVE" ? seatId : existing.seatId,
        },
      });

      if (existing.status === "ACTIVE") {
        if (existing.seatId && existing.seatId !== seatId) {
          await tx.seat.update({
            where: { id: existing.seatId },
            data: { status: "AVAILABLE" },
          });
        }
        if (seatId) {
          await tx.seat.update({ where: { id: seatId }, data: { status: "OCCUPIED" } });
        }
      }
    });

    revalidateAll();
    return successState("Member details updated.");
  } catch (error) {
    return errorState(prismaErrorMessage(error));
  }
}

/** Leaving keeps every record, releases the seat and never deletes anything. */
export async function markMemberLeftAction(formData: FormData): Promise<void> {
  const parsed = markLeftSchema.safeParse({
    memberId: formData.get("memberId"),
    leavingDate: formData.get("leavingDate"),
  });

  if (!parsed.success) redirect("/members?error=leaving-date");

  const leavingDate = parseInputDate(parsed.data.leavingDate);

  await prisma.$transaction(async (tx) => {
    const member = await tx.member.findUnique({
      where: { id: parsed.data.memberId },
      select: { id: true, seatId: true },
    });
    if (!member) return;

    await tx.member.update({
      where: { id: member.id },
      data: { status: "LEFT", leavingDate, seatId: null },
    });

    if (member.seatId) {
      await tx.seat.update({
        where: { id: member.seatId },
        data: { status: "AVAILABLE" },
      });
    }
  });

  revalidateAll();
}

/** Seat search used by the "Mark as Left" and edit dialogs. */
export async function getMemberForEdit(memberId: number) {
  return prisma.member.findUnique({
    where: { id: memberId },
    include: { seat: { include: { room: true } } },
  });
}