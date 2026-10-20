"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { errorState, prismaErrorMessage, successState, type ActionState } from "@/lib/action-result";
import { getSession } from "@/lib/auth";
import { actionPermission, can, canAny } from "@/lib/permissions";
import { parseInputDate, shiftMonthKey } from "@/lib/format";
import { nextMemberId, nextPaymentId, newPayToken, newReceiptToken } from "@/lib/ids";
import { markGapMonthsNotApplicable, syncPendingAmounts } from "@/lib/membership";
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
import { DEFAULT_MEMBER_SORT, isMemberSort, LIBRARY_PREPAID_OFFER } from "@/lib/constants";

function revalidateAll() {
  revalidatePath("/dashboard");
  revalidatePath("/members");
  // The member detail page is a dynamic route, so it needs its own call with
  // the route pattern and "page" type. Revalidating "/members" alone refreshes
  // the list but leaves "/members/<id>" showing the pre-edit details until a
  // manual reload — the "edit only seems to save after refresh" report.
  revalidatePath("/members/[id]", "page");
  revalidatePath("/payments");
  revalidatePath("/reminders");
  revalidatePath("/");
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
  const session = await getSession();
  if (!session || !canAny(session, ["MEMBERS", "SEATS"])) return { members: [], total: 0 };
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
  const gate = await actionPermission("MEMBERS");
  if ("denied" in gate) return gate.denied;
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
  const offer3Plus1 = formData.get("offer3Plus1") === "1";
  const wantsPayment =
    offer3Plus1 || (data.payAmount !== undefined && data.payMode !== undefined);
  if (wantsPayment && (!data.payMonth || !data.payDate)) {
    return errorState("Please check the highlighted fields.", {
      payMonth: "Choose the month this payment is for",
      payDate: "Payment date is required",
    });
  }
  if (offer3Plus1 && data.payMode === "OFFER") {
    return errorState("Pick Cash or Online for the paid months of the offer.", {
      payMode: "Cash or Online",
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
          payToken: newPayToken(),
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
        const startMonth = data.payMonth as string;
        const payDate = parseInputDate(data.payDate as string);

        if (offer3Plus1) {
          // One join with the 3 + 1 offer becomes four payments: three months
          // at the fee starting from the chosen month, then the fourth month
          // free, recorded as a zero-rupee offer so it never shows as due.
          const perMonth = data.payAmount ?? data.monthlyFee ?? standardFee;
          for (let step = 0; step < LIBRARY_PREPAID_OFFER.paidMonths; step++) {
            await tx.payment.create({
              data: {
                paymentId: await nextPaymentId(tx),
                memberId: created.id,
                month: shiftMonthKey(startMonth, step),
                amount: perMonth,
                paymentMode: data.payMode as "CASH" | "ONLINE",
                paymentDate: payDate,
                status: "PAID",
                remarks: "Thanks for joining us",
                receiptToken: newReceiptToken(),
              },
            });
          }
          await tx.payment.create({
            data: {
              paymentId: await nextPaymentId(tx),
              memberId: created.id,
              month: shiftMonthKey(startMonth, LIBRARY_PREPAID_OFFER.paidMonths),
              amount: 0,
              paymentMode: "OFFER",
              paymentDate: payDate,
              status: "PAID",
              remarks: "Free month — 3 + 1 offer",
              receiptToken: newReceiptToken(),
            },
          });
        } else {
          await tx.payment.create({
            data: {
              paymentId: await nextPaymentId(tx),
              memberId: created.id,
              month: startMonth,
              amount: data.payAmount as number,
              paymentMode: data.payMode as "CASH" | "ONLINE" | "OFFER",
              paymentDate: payDate,
              status: "PAID",
              remarks: "Thanks for joining us",
              receiptToken: newReceiptToken(),
            },
          });
        }
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
  const gate = await actionPermission("MEMBERS");
  if ("denied" in gate) return gate.denied;
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
      select: { id: true, seatId: true, status: true, leavingDate: true },
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

      const email = formData.has("email") ? (data.email ?? null) : undefined;

      await tx.member.update({
        where: { id: existing.id },
        data: {
          name: data.name,
          mobile: data.mobile,
          // Only touch the email when the form carried the field, so an older
          // form can never blank a saved address by omitting it.
          email,
          guardianName: data.guardianName ?? null,
          guardianMobile: data.guardianMobile ?? null,
          joiningDate: parseInputDate(data.joiningDate),
          remarks: data.remarks ?? null,
          seatId: existing.status === "ACTIVE" || rejoining ? seatId : existing.seatId,
          status: rejoining ? "ACTIVE" : undefined,
          leavingDate: rejoining ? null : undefined,
        },
      });

      // The application that produced this member keeps its own copy of the
      // personal details. Copy the corrected values across so the two screens
      // never disagree about the same person.
      await tx.application.updateMany({
        where: { memberId: existing.id },
        data: {
          name: data.name,
          mobile: data.mobile,
          email,
          guardianName: data.guardianName ?? null,
          guardianMobile: data.guardianMobile ?? null,
          desiredJoiningDate: parseInputDate(data.joiningDate),
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

      // A returning member was away for the months between the one they left in
      // and the one they come back in; mark those so they are never billed. This
      // runs before the fee sync below, so a stale PENDING row in the gap is
      // turned into NOT_APPLICABLE rather than re-priced as a real month.
      if (rejoining) {
        await markGapMonthsNotApplicable(
          tx,
          existing.id,
          existing.leavingDate,
          parseInputDate(data.joiningDate),
        );
      }

      // The fee the member now pays: the values above leave the stored fee unset
      // when it matches the standard, so fall back to the standard for the
      // rewrite. Unpaid months then follow the new fee instead of the old one.
      await syncPendingAmounts(tx, existing.id, data.monthlyFee ?? standardFee);
    });

    revalidateAll();
    return successState("Member details updated.");
  } catch (error) {
    return errorState(prismaErrorMessage(error));
  }
}

/** Leaving keeps every record, releases the seat and never deletes anything. */
export async function markMemberLeftAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!can(session, "MEMBERS")) redirect("/dashboard");
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

/**
 * Permanently removes a member.
 *
 * This is the destructive option the owner asked for: their payment history is
 * deleted with them (by the cascade) and their seat is released and marked
 * available. Applications they came from are unlinked but kept.
 */
export async function deleteMemberAction(memberId: number): Promise<ActionState> {
  const gate = await actionPermission("MEMBERS");
  if ("denied" in gate) return gate.denied;
  if (!Number.isInteger(memberId) || memberId <= 0) {
    return errorState("Member not found.");
  }

  try {
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: { id: true, seatId: true },
    });
    if (!member) return errorState("Member not found.");

    await prisma.$transaction(async (tx) => {
      if (member.seatId) {
        await tx.seat.update({
          where: { id: member.seatId },
          data: { status: "AVAILABLE" },
        });
      }
      await tx.setting.deleteMany({ where: { key: memberFeeKey(member.id) } });
      await tx.member.delete({ where: { id: member.id } });
    });

    revalidateAll();
    return successState("Member deleted.");
  } catch (error) {
    return errorState(prismaErrorMessage(error));
  }
}

/** Seat search used by the "Mark as Left" and edit dialogs. */
export async function getMemberForEdit(memberId: number) {
  const session = await getSession();
  if (!session || !canAny(session, ["MEMBERS", "SEATS"])) return null;
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