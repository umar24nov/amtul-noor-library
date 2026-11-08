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
import { logMemberChange, MEMBER_AUDIT_ACTIONS, type MemberAuditChange } from "@/lib/member-audit";
import { monthKeyFromInputDate } from "@/lib/format";

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

      await logMemberChange(tx, {
        memberId: created.id,
        action: MEMBER_AUDIT_ACTIONS.MEMBER_CREATED,
        summary: "Member created",
      });

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
      select: {
        id: true,
        seatId: true,
        status: true,
        leavingDate: true,
        name: true,
        mobile: true,
        email: true,
        guardianName: true,
        guardianMobile: true,
        joiningDate: true,
        remarks: true,
      },
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
      const newJoiningDate = parseInputDate(data.joiningDate);
      const newEmail = email;
      const newGuardianName = data.guardianName ?? null;
      const newGuardianMobile = data.guardianMobile ?? null;
      const newRemarks = data.remarks ?? null;

      await tx.member.update({
        where: { id: existing.id },
        data: {
          name: data.name,
          mobile: data.mobile,
          // Only touch the email when the form carried the field, so an older
          // form can never blank a saved address by omitting it.
          email,
          guardianName: newGuardianName,
          guardianMobile: newGuardianMobile,
          joiningDate: newJoiningDate,
          remarks: newRemarks,
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
        const oldSeatId = existing.seatId;
        if (oldSeatId && oldSeatId !== seatId) {
          await tx.seat.update({
            where: { id: oldSeatId },
            data: { status: "AVAILABLE" },
          });
          await logMemberChange(tx, {
            memberId: existing.id,
            action: oldSeatId && seatId ? MEMBER_AUDIT_ACTIONS.SEAT_CHANGED : MEMBER_AUDIT_ACTIONS.SEAT_RELEASED,
            summary: oldSeatId && seatId ? "Seat changed" : "Seat released",
            metadata: { oldSeatId, newSeatId: seatId },
          });
        }
        if (seatId && oldSeatId !== seatId && !(oldSeatId && oldSeatId !== seatId)) {
          await tx.seat.update({ where: { id: seatId }, data: { status: "OCCUPIED" } });
          await logMemberChange(tx, {
            memberId: existing.id,
            action: MEMBER_AUDIT_ACTIONS.SEAT_ASSIGNED,
            summary: "Seat assigned",
            metadata: { oldSeatId, newSeatId: seatId },
          });
        } else if (seatId && oldSeatId !== seatId) {
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
          newJoiningDate,
        );
        await logMemberChange(tx, {
          memberId: existing.id,
          action: MEMBER_AUDIT_ACTIONS.MEMBER_REJOINED,
          summary: "Member rejoined",
        });
      }

      const changes: MemberAuditChange[] = [];
      if (existing.name !== data.name) changes.push({ field: "name", label: "Name", old: existing.name, new: data.name });
      if ((existing.mobile || "") !== (data.mobile || "")) changes.push({ field: "mobile", label: "Mobile", old: existing.mobile, new: data.mobile });
      if (formData.has("email") && (existing.email || null) !== newEmail) changes.push({ field: "email", label: "Email", old: existing.email, new: newEmail });
      if ((existing.guardianName || null) !== newGuardianName) changes.push({ field: "guardianName", label: "Guardian name", old: existing.guardianName, new: newGuardianName });
      if ((existing.guardianMobile || null) !== newGuardianMobile) changes.push({ field: "guardianMobile", label: "Guardian mobile", old: existing.guardianMobile, new: newGuardianMobile });
      if (existing.joiningDate.getTime() !== newJoiningDate.getTime()) changes.push({ field: "joiningDate", label: "Joining date", old: existing.joiningDate.toISOString().slice(0, 10), new: newJoiningDate.toISOString().slice(0, 10) });
      if ((existing.remarks || null) !== newRemarks) changes.push({ field: "remarks", label: "Remarks", old: existing.remarks, new: newRemarks });
      if (existing.seatId !== (existing.status === "ACTIVE" || rejoining ? seatId : existing.seatId)) {
        // seat change logged separately below if needed
      }

      if (changes.length > 0 && !rejoining) {
        await logMemberChange(tx, {
          memberId: existing.id,
          action: MEMBER_AUDIT_ACTIONS.MEMBER_UPDATED,
          summary: `Updated ${changes.map((c) => c.label.toLowerCase()).join(", ")}`,
          changes,
        });
      } else if (changes.length > 0 && rejoining) {
        await logMemberChange(tx, {
          memberId: existing.id,
          action: MEMBER_AUDIT_ACTIONS.MEMBER_UPDATED,
          summary: `Updated ${changes.map((c) => c.label.toLowerCase()).join(", ")}`,
          changes,
        });
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

    await logMemberChange(tx, {
      memberId: member.id,
      action: MEMBER_AUDIT_ACTIONS.MEMBER_MARKED_LEFT,
      summary: "Marked as left",
      metadata: { leavingDate: leavingDate.toISOString().slice(0, 10), seatReleased: Boolean(member.seatId) },
    });
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

/**
 * Applies the 3+1 prepaid offer for a member starting from a given month.
 * Creates/updates payment records so 3 months are paid + 1 month is free.
 * If an existing payment for the start month covers 3 months' worth (e.g. ₹2100 for ₹700/mo),
 * it will be split across the 3 paid months.
 */
export async function applyThreePlusOneOfferAction(formData: FormData): Promise<ActionState> {
  const gate = await actionPermission("MEMBERS");
  if ("denied" in gate) return gate.denied;

  const memberPk = Number(formData.get("memberId"));
  const startMonth = String(formData.get("startMonth") || "").trim();
  const payMode = (String(formData.get("payMode") || "CASH").trim().toUpperCase() as "CASH" | "ONLINE") || "CASH";
  const payDateRaw = String(formData.get("payDate") || "").trim();

  if (!Number.isInteger(memberPk) || memberPk <= 0) return errorState("Member not found.");
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(startMonth)) return errorState("Choose a valid start month.", { startMonth: "Choose a valid month" });

  try {
    const [member, standardFee, memberFee] = await Promise.all([
      prisma.member.findUnique({ where: { id: memberPk }, select: { id: true, name: true, joiningDate: true } }),
      getMonthlyFee(),
      getMemberFee(memberPk),
    ]);
    if (!member) return errorState("Member not found.");

    const monthlyFee = memberFee ?? standardFee;
    if (monthlyFee <= 0) return errorState("This member has no monthly fee set.");

    const joinedMonth = monthKeyFromInputDate(member.joiningDate.toISOString());
    if (startMonth < joinedMonth) {
      return errorState(`Start month cannot be before joining month (${joinedMonth}).`, { startMonth: "Before joining month" });
    }

    const payDate = payDateRaw ? parseInputDate(payDateRaw) : new Date();
    const months = [
      startMonth,
      shiftMonthKey(startMonth, 1),
      shiftMonthKey(startMonth, 2),
      shiftMonthKey(startMonth, 3),
    ];

    await prisma.$transaction(async (tx) => {
      // Find existing payments for these months
      const existing = await tx.payment.findMany({
        where: { memberId: memberPk, month: { in: months } },
        orderBy: [{ month: "asc" }, { createdAt: "asc" }],
      });
      const byMonth = new Map<string, typeof existing>();
      for (const p of existing) {
        const list = byMonth.get(p.month) || [];
        list.push(p);
        byMonth.set(p.month, list);
      }

      // Detect overpayment on start month (e.g., 2100 for 700/mo fee = 3 months paid)
      const startPayments = byMonth.get(startMonth) || [];
      const startPaid = startPayments.find((p) => p.status === "PAID" && Number(p.amount) >= monthlyFee * 2);
      let splitFromId: number | null = null;

      // Create/update 3 paid months
      for (let i = 0; i < LIBRARY_PREPAID_OFFER.paidMonths; i++) {
        const month = months[i];
        const monthPayments = byMonth.get(month) || [];
        const autoPending = monthPayments.find((p) => p.status === "PENDING" && p.remarks === "Auto generated as pending");
        const existingPaid = monthPayments.find((p) => p.status === "PAID");

        if (i === 0 && startPaid && Number(startPaid.amount) >= monthlyFee * LIBRARY_PREPAID_OFFER.paidMonths) {
          // Split the large payment into the first paid month
          await tx.payment.update({
            where: { id: startPaid.id },
            data: {
              month,
              amount: monthlyFee,
              paymentMode: startPaid.paymentMode === "OFFER" ? payMode : startPaid.paymentMode,
              paymentDate: payDate,
              status: "PAID",
              remarks: "3+1 offer (paid month 1/3)",
            },
          });
          splitFromId = startPaid.id;
          // Remove other pending placeholders for same month if they exist
          for (const p of monthPayments) {
            if (p.id !== startPaid.id && p.status === "PENDING" && p.remarks === "Auto generated as pending") {
              await tx.payment.delete({ where: { id: p.id } });
            }
          }
        } else if (existingPaid && i === 0 && splitFromId === null) {
          // Keep existing paid if it's reasonable, but normalize
          await tx.payment.update({
            where: { id: existingPaid.id },
            data: {
              amount: monthlyFee,
              status: "PAID",
              paymentDate: payDate,
              remarks: existingPaid.remarks?.includes("3+1") ? existingPaid.remarks : "3+1 offer (paid month 1/3)",
            },
          });
        } else if (autoPending) {
          await tx.payment.update({
            where: { id: autoPending.id },
            data: {
              amount: monthlyFee,
              paymentMode: payMode,
              paymentDate: payDate,
              status: "PAID",
              remarks: `3+1 offer (paid month ${i + 1}/3)`,
            },
          });
        } else if (monthPayments.some((p) => p.status === "PAID")) {
          // Already paid - update to reflect offer
          const paid = monthPayments.find((p) => p.status === "PAID")!;
          await tx.payment.update({
            where: { id: paid.id },
            data: { remarks: paid.remarks?.includes("3+1") ? paid.remarks : `3+1 offer (paid month ${i + 1}/3)` },
          });
        } else {
          await tx.payment.create({
            data: {
              paymentId: await nextPaymentId(tx),
              memberId: memberPk,
              month,
              amount: monthlyFee,
              paymentMode: payMode,
              paymentDate: payDate,
              status: "PAID",
              remarks: `3+1 offer (paid month ${i + 1}/3)`,
              receiptToken: newReceiptToken(),
            },
          });
        }
      }

      // 4th month - free offer
      const freeMonth = months[3];
      const freePayments = byMonth.get(freeMonth) || [];
      const freeAutoPending = freePayments.find((p) => p.status === "PENDING" && p.remarks === "Auto generated as pending");
      const freePaid = freePayments.find((p) => p.status === "PAID");

      if (freeAutoPending) {
        await tx.payment.update({
          where: { id: freeAutoPending.id },
          data: {
            amount: 0,
            paymentMode: "OFFER",
            paymentDate: payDate,
            status: "PAID",
            remarks: "Free month — 3 + 1 offer",
          },
        });
      } else if (freePaid) {
        await tx.payment.update({
          where: { id: freePaid.id },
          data: {
            amount: 0,
            paymentMode: "OFFER",
            status: "PAID",
            remarks: "Free month — 3 + 1 offer",
          },
        });
      } else {
        await tx.payment.create({
          data: {
            paymentId: await nextPaymentId(tx),
            memberId: memberPk,
            month: freeMonth,
            amount: 0,
            paymentMode: "OFFER",
            paymentDate: payDate,
            status: "PAID",
            remarks: "Free month — 3 + 1 offer",
            receiptToken: newReceiptToken(),
          },
        });
      }

      await logMemberChange(tx, {
        memberId: memberPk,
        action: MEMBER_AUDIT_ACTIONS.PAYMENT_RECORDED,
        summary: `Applied 3+1 offer (${months[0]} to ${months[3]})`,
        metadata: { offer: "3+1", months, monthlyFee: String(monthlyFee), payMode, startMonth },
      });
    });

    revalidateAll();
    return successState(`3+1 offer applied for ${member.name} (${months[0]} to ${months[3]}).`);
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