"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { errorState, prismaErrorMessage, successState, type ActionState } from "@/lib/action-result";
import { parseInputDate } from "@/lib/format";
import { nextMemberId, nextPaymentId } from "@/lib/ids";
import { memberFormSchema, fieldErrors, markLeftSchema } from "@/lib/validators";
import { prisma } from "@/lib/prisma";
import {
  effectiveMemberFee,
  getMemberFee,
  getMonthlyFee,
  memberFeeKey,
  memberFeesByMemberId,
  withMemberFees,
} from "@/lib/settings";
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
  const [{ members, total }, standardFee, fees] = await Promise.all([
    listMembers({
      search: filters.q,
      status:
        filters.status === "LEFT" ? "LEFT" : filters.status === "ALL" ? "ALL" : "ACTIVE",
      room:
        filters.room === "NONE"
          ? "NONE"
          : Number.isInteger(roomId) && roomId > 0
            ? roomId
            : undefined,
      sort: isMemberSort(filters.sort) ? filters.sort : DEFAULT_MEMBER_SORT,
      page: filters.page ?? 2,
    }),
    getMonthlyFee(),
    memberFeesByMemberId(),
  ]);

  return { members: withMemberFees(members, standardFee, fees), total };
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
    email: formData.get("email"),
    guardianName: formData.get("guardianName"),
    guardianMobile: formData.get("guardianMobile"),
    joiningDate: formData.get("joiningDate"),
    remarks: formData.get("remarks"),
    seatId: readSeatId(formData),
    monthlyFee: formData.get("monthlyFee"),
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
    const standardFee = await getMonthlyFee();

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
          email: data.email ?? null,
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

      if (data.monthlyFee !== undefined && data.monthlyFee !== standardFee) {
        await tx.setting.upsert({
          where: { key: memberFeeKey(created.id) },
          update: { value: String(data.monthlyFee) },
          create: { key: memberFeeKey(created.id), value: String(data.monthlyFee) },
        });
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
    email: formData.get("email"),
    guardianName: formData.get("guardianName"),
    guardianMobile: formData.get("guardianMobile"),
    joiningDate: formData.get("joiningDate"),
    remarks: formData.get("remarks"),
    seatId: readSeatId(formData),
    monthlyFee: formData.get("monthlyFee"),
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
    const standardFee = await getMonthlyFee();

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
      // A member who had left comes back simply by giving them a seat again.
      // Their joining date is kept, so they hold their original place in the
      // join-date order.
      const rejoining = existing.status === "LEFT" && seatId !== null;

      await tx.member.update({
        where: { id: existing.id },
        data: {
          name: data.name,
          mobile: data.mobile,
          // Only touch the email when the form carried the field, so an older
          // form can never blank a saved address by omitting it.
          email: formData.has("email") ? (data.email ?? null) : undefined,
          guardianName: data.guardianName ?? null,
          guardianMobile: data.guardianMobile ?? null,
          joiningDate: parseInputDate(data.joiningDate),
          remarks: data.remarks ?? null,
          seatId: existing.status === "ACTIVE" || rejoining ? seatId : existing.seatId,
          status: rejoining ? "ACTIVE" : undefined,
          leavingDate: rejoining ? null : undefined,
        },
      });

      if (existing.status === "ACTIVE" || rejoining) {
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

      if (data.monthlyFee !== undefined && data.monthlyFee !== standardFee) {
        await tx.setting.upsert({
          where: { key: memberFeeKey(existing.id) },
          update: { value: String(data.monthlyFee) },
          create: { key: memberFeeKey(existing.id), value: String(data.monthlyFee) },
        });
      } else {
        await tx.setting.deleteMany({ where: { key: memberFeeKey(existing.id) } });
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
  const [member, standardFee, memberFee] = await Promise.all([
    prisma.member.findUnique({
      where: { id: memberId },
      include: { seat: { include: { room: true } } },
    }),
    getMonthlyFee(),
    getMemberFee(memberId),
  ]);
  if (!member) return null;
  return { ...member, defaultFee: effectiveMemberFee(memberFee, standardFee) };
}