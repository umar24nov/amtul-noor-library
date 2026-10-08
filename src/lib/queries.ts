import "server-only";
import { cache } from "react";
import {
  currentMonthKey,
  monthKeyFromInputDate,
  monthSelectOptions,
  monthWindow,
  parseInputDate,
  recentMonthKeys,
  selectableMonthKeys,
} from "@/lib/format";
import { toNumber } from "@/lib/ids";
import { prisma } from "@/lib/prisma";
import {
  memberRoomWhere,
  seatRoomWhere,
  type RoomFilter,
} from "@/lib/room-filter";
import { getMonthlyFee, memberFeesByMemberId } from "@/lib/settings";
import { DEFAULT_MEMBER_SORT, PAGE_SIZE, type MemberSort } from "@/lib/constants";
import type {
  Member,
  Payment,
  PaymentMode,
  PaymentStatus,
  Room,
  Seat,
} from "@/generated/prisma/client";

export type MemberWithSeat = Member & {
  seat: (Seat & { room: Room }) | null;
};

export type MemberWithSeatAndPayments = MemberWithSeat & { payments: Payment[] };

/** Effective status of one member for one month. */
export type MonthStatus = PaymentStatus | "NONE";

export type MonthSummaryRow = {
  memberPk: number;
  memberId: string;
  name: string;
  mobile: string | null;
  joiningDate: Date;
  seatLabel: string | null;
  seatNumber: string | null;
  memberStatus: Member["status"];
  /** This member's own monthly fee (or the standard one when unset). */
  fee: number;
  collected: number;
  due: number;
  modes: string[];
  status: MonthStatus;
  hasRecords: boolean;
};

const MODE_LABELS: Record<PaymentMode, string> = {
  CASH: "Cash",
  ONLINE: "Online",
  OFFER: "Offer",
};

export function deriveMonthStatus(
  payments: Pick<Payment, "status">[],
  joinedAfterMonth: boolean,
): MonthStatus {
  if (joinedAfterMonth) return "NOT_APPLICABLE";
  if (payments.some((payment) => payment.status === "PAID")) return "PAID";
  if (payments.some((payment) => payment.status === "WAIVED")) return "WAIVED";
  if (payments.some((payment) => payment.status === "ON_HOLD")) return "ON_HOLD";
  if (payments.some((payment) => payment.status === "NOT_APPLICABLE")) return "NOT_APPLICABLE";
  if (payments.some((payment) => payment.status === "PENDING")) return "PENDING";
  return "NONE";
}

/**
 * Members who are relevant for a month: everyone currently active, plus anyone
 * who left during or after that month so past months still reconcile.
 */
export type MemberScope = "ACTIVE" | "LEFT" | "ALL";

/**
 * The dashboard list is long, so it defaults to active members only. Members who
 * left during the chosen month still belong in that month, because they were a
 * member when it started.
 */
export function membersForMonthWhere(month: string, scope: MemberScope = "ACTIVE") {
  const monthStart = parseInputDate(`${month}-01`);
  const monthMembers = {
    OR: [
      { status: "ACTIVE" as const },
      { status: "LEFT" as const, leavingDate: { gte: monthStart } },
    ],
  };

  if (scope === "ALL") return monthMembers;
  if (scope === "LEFT") return { ...monthMembers, status: "LEFT" as const };
  return { status: "ACTIVE" as const };
}

export async function getMonthSummary(
  month: string,
  scope: MemberScope = "ACTIVE",
  room?: RoomFilter,
): Promise<MonthSummaryRow[]> {
  const [standardFee, memberFees] = await Promise.all([
    getMonthlyFee(),
    memberFeesByMemberId(),
  ]);
  const members = await prisma.member.findMany({
    // Two independent conditions, so they are combined rather than spread into
    // one object where the second would overwrite the first.
    where: { AND: [membersForMonthWhere(month, scope), memberRoomWhere(room)] },
    include: {
      seat: { include: { room: true } },
      payments: { where: { month } },
    },
    orderBy: [{ seat: { seatNumber: "asc" } }, { name: "asc" }],
  });

  return members.map((member) =>
    buildSummaryRow(
      member,
      month,
      memberFees.get(member.id) ?? standardFee,
    ),
  );
}

function buildSummaryRow(
  member: MemberWithSeatAndPayments,
  month: string,
  memberFee: number,
): MonthSummaryRow {
  const joinedAfterMonth = monthKeyFromInputDate(member.joiningDate.toISOString()) > month;
  const payments = joinedAfterMonth ? [] : member.payments;

  const settled = payments.filter(
    (payment) => payment.status === "PAID" || payment.status === "WAIVED",
  );
  const pending = payments.filter((payment) => payment.status === "PENDING");
  const collected = settled.reduce((total, payment) => total + toNumber(payment.amount), 0);
  const pendingAmount = pending.reduce((total, payment) => total + toNumber(payment.amount), 0);

  const status = deriveMonthStatus(payments, joinedAfterMonth);
  const isDue = status === "PENDING" || status === "NONE";

  return {
    memberPk: member.id,
    memberId: member.memberId,
    name: member.name,
    mobile: member.mobile,
    joiningDate: member.joiningDate,
    seatLabel: member.seat
      ? `${member.seat.room ? `${member.seat.room.name} · ` : ""}${member.seat.seatNumber}`
      : null,
    seatNumber: member.seat?.seatNumber ?? null,
    memberStatus: member.status,
    fee: memberFee,
    collected,
    due: isDue ? (pendingAmount > 0 ? pendingAmount : memberFee) : pendingAmount,
    modes: Array.from(new Set(payments.map((payment) => MODE_LABELS[payment.paymentMode]))),
    status,
    hasRecords: payments.length > 0,
  };
}

export type DashboardData = {
  month: string;
  fee: number;
  totalMembers: number;
  activeMembers: number;
  totalSeats: number;
  occupiedSeats: number;
  availableSeats: number;
  monthCollection: number;
  pendingCount: number;
  pendingAmount: number;
  summary: MonthSummaryRow[];
};

export const getDashboardData = cache(
  async (
    month: string,
    scope: MemberScope = "ACTIVE",
    room?: RoomFilter,
  ): Promise<DashboardData> => {
    const roomWhere = memberRoomWhere(room);
    const [totalMembers, activeMembers, seatCounts, fee, monthSummary] = await Promise.all([
      prisma.member.count({ where: roomWhere }),
      prisma.member.count({ where: { ...roomWhere, status: "ACTIVE" } }),
      prisma.seat.groupBy({
        by: ["status"],
        where: seatRoomWhere(room),
        _count: { _all: true },
      }),
      getMonthlyFee(),
      // Totals come from everyone who was a member that month, so the scope
      // filter below never changes the collection figures. The room filter is
      // different: picking a room means "show me this room", so it narrows
      // every figure, otherwise the cards would contradict the selection.
      getMonthSummary(month, "ALL", room),
    ]);

    const totalSeats = seatCounts.reduce((total, group) => total + group._count._all, 0);
    const occupiedSeats =
      seatCounts.find((group) => group.status === "OCCUPIED")?._count._all ?? 0;

    const monthCollection = monthSummary.reduce((total, row) => total + row.collected, 0);
    const pendingRows = monthSummary.filter(
      (row) => row.memberStatus === "ACTIVE" && row.status === "PENDING",
    );

    return {
      month,
      fee,
      totalMembers,
      activeMembers,
      totalSeats,
      occupiedSeats,
      availableSeats: totalSeats - occupiedSeats,
      monthCollection,
      pendingCount: pendingRows.length,
      pendingAmount: pendingRows.reduce((total, row) => total + row.due, 0),
      summary:
        scope === "ALL"
          ? monthSummary
          : monthSummary.filter((row) => row.memberStatus === scope),
    };
  },
);

export type MemberListFilters = {
  search?: string;
  status?: "ALL" | "ACTIVE" | "LEFT";
  page?: number;
  sort?: MemberSort;
  /** A room id, or "NONE" for members who are not sitting anywhere. */
  room?: number | "NONE";
};

/**
 * Translates a sort key into a Prisma orderBy. Every option ends with a unique
 * tiebreaker so pagination cannot show the same member twice or skip one when
 * two rows share the same name, seat or date.
 */
function memberOrderBy(sort: MemberSort) {
  const byName = { name: "asc" } as const;
  const byId = { id: "asc" } as const;

  switch (sort) {
    case "name-asc":
      return [byName, byId];
    case "name-desc":
      return [{ name: "desc" as const }, byId];
    case "seat":
      return [{ seat: { seatNumber: "asc" as const } }, byName, byId];
    case "newest":
      return [{ joiningDate: "desc" as const }, byId];
    case "oldest":
      return [{ joiningDate: "asc" as const }, byId];
    case "member-id":
      return [{ memberId: "asc" as const }, byId];
    case "recently-updated":
      return [{ updatedAt: "desc" as const }, byId];
    default:
      return [{ status: "asc" as const }, byName, byId];
  }
}

export type MemberListResult = {
  members: MemberWithSeat[];
  total: number;
  page: number;
};

export async function listMembers({
  search,
  status = "ALL",
  page = 1,
  sort = DEFAULT_MEMBER_SORT,
  room,
}: MemberListFilters): Promise<MemberListResult> {
  const term = search?.trim();
  // Raw digits, deliberately not normalizeSeatNumber: that pads to "01" for
  // storage, but as a search fragment "1" should also find seat 10. An empty
  // string is worse than useless here, because SQL `contains ''` matches every
  // row and would make the whole OR always true.
  const seatDigits = term ? term.replace(/\D/g, "") : "";
  const where = {
    ...(status === "ACTIVE" ? { status: "ACTIVE" as const } : {}),
    ...(status === "LEFT" ? { status: "LEFT" as const } : {}),
    // A member sits in a room through their seat, so the room is a nested
    // filter. Members with no seat are a real group too, hence the NONE case.
    ...(room === "NONE"
      ? { seatId: null }
      : room !== undefined
        ? { seat: { roomId: room } }
        : {}),
    ...(term
      ? {
          OR: [
            { name: { contains: term, mode: "insensitive" as const } },
            { mobile: { contains: term } },
            { memberId: { contains: term.toUpperCase() } },
            ...(seatDigits
              ? [{ seat: { seatNumber: { contains: seatDigits } } }]
              : []),
          ],
        }
      : {}),
  };

  const [total, members] = await Promise.all([
    prisma.member.count({ where }),
    prisma.member.findMany({
      where,
      include: { seat: { include: { room: true } } },
      orderBy: memberOrderBy(sort),
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  return { members, total, page };
}

export const getMemberDetail = cache(async (id: number) => {
  return prisma.member.findUnique({
    where: { id },
    include: {
      seat: { include: { room: true } },
      payments: { orderBy: [{ month: "desc" }, { createdAt: "desc" }] },
    },
  });
});

export type PaymentFilters = {
  month?: string;
  /** The public member code, for example ATN003. */
  memberId?: string;
  memberSearch?: string;
  mode?: PaymentMode | "ALL";
  status?: PaymentStatus | "ALL";
  page?: number;
};

export type PaymentListResult = {
  payments: (Payment & { member: MemberWithSeat })[];
  total: number;
  page: number;
  /** Sum of every matching payment, not just the ones loaded on screen. */
  totalAmount: number;
};

export async function listPayments({
  month,
  memberId,
  memberSearch,
  mode,
  status,
  page = 1,
}: PaymentFilters): Promise<PaymentListResult> {
  const term = memberSearch?.trim();
  const where = {
    ...(month ? { month } : {}),
    ...(memberId ? { member: { memberId: memberId.trim().toUpperCase() } } : {}),
    ...(mode && mode !== "ALL" ? { paymentMode: mode } : {}),
    ...(status && status !== "ALL" ? { status } : {}),
    ...(term
      ? {
          member: {
            OR: [
              { name: { contains: term, mode: "insensitive" as const } },
              { mobile: { contains: term } },
              { memberId: { contains: term.toUpperCase() } },
            ],
          },
        }
      : {}),
  };

  const [total, payments, amounts] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      include: { member: { include: { seat: { include: { room: true } } } } },
      orderBy: [{ month: "desc" }, { paymentDate: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    // The list grows by scrolling now, so the headline figure has to describe
    // every matching payment rather than whichever rows happen to be loaded.
    prisma.payment.aggregate({ where, _sum: { amount: true } }),
  ]);

  return {
    payments,
    total,
    page,
    totalAmount: toNumber(amounts._sum.amount),
  };
}

export type PaymentStats = {
  monthCollection: number;
  monthPaidCount: number;
  monthPendingCount: number;
  monthPendingAmount: number;
  allTimeCollection: number;
};

export const getPaymentStats = cache(async (month: string): Promise<PaymentStats> => {
  const fee = await getMonthlyFee();
  const [summary, allTime] = await Promise.all([
    getMonthSummary(month),
    prisma.payment.aggregate({
      where: { status: "PAID" },
      _sum: { amount: true },
    }),
  ]);

  const paidRows = summary.filter((row) => row.status === "PAID" || row.status === "WAIVED");
  const pendingRows = summary.filter(
    (row) => row.memberStatus === "ACTIVE" && row.status === "PENDING",
  );

  return {
    monthCollection: summary.reduce((total, row) => total + row.collected, 0),
    monthPaidCount: paidRows.length,
    monthPendingCount: pendingRows.length,
    monthPendingAmount: pendingRows.reduce((total, row) => total + (row.due || fee), 0),
    allTimeCollection: toNumber(allTime._sum.amount),
  };
});

export const listActiveMembers = cache(async () => {
  return prisma.member.findMany({
    where: { status: "ACTIVE" },
    include: { seat: { include: { room: true } } },
    orderBy: { name: "asc" },
  });
});

export type SeatWithOccupant = Seat & {
  room: Room;
  occupants: (Member & { seat: Seat | null })[];
};

export async function getRoomsWithSeats() {
  return prisma.room.findMany({
    include: {
      seats: {
        include: {
          room: true,
          occupants: { include: { seat: true } },
        },
        orderBy: { seatNumber: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });
}

/**
 * Just the room names, for filter dropdowns. Deliberately does not pull in
 * seats or occupants the way getRoomsWithSeats does, so a filter on a page
 * that already lists members stays cheap.
 */
export const listRooms = cache(async () => {
  return prisma.room.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
});

export const listOpenSeats = cache(async (excludeSeatId?: number) => {  return prisma.seat.findMany({
    where: {
      status: "AVAILABLE",
      ...(excludeSeatId ? { id: { not: excludeSeatId } } : {}),
    },
    include: { room: true },
    orderBy: [{ room: { name: "asc" } }, { seatNumber: "asc" }],
  });
});

export const getDashboardMonth = () => currentMonthKey();

/**
 * Every month the app should let someone pick, newest first.
 *
 * Derived from the data rather than a fixed window, so it keeps up as the
 * library grows: the first payment or joining date sets the floor, the latest
 * payment or leaving date sets the ceiling, and both ends are padded so there is
 * always room either side of today.
 *
 * `padForward` defaults to the full `MONTH_PAD_FORWARD`, which is what the
 * recording forms want. The dashboard and payments filters pass
 * `MONTH_FILTER_PAD_FORWARD` instead, so browsing is not offered months that
 * have nothing in them.
 */
export const listSelectableMonths = cache(
  async (padForward?: number): Promise<string[]> => {
    const [paymentMonths, joiningDates, leavingDates] = await Promise.all([
      prisma.payment.aggregate({ _min: { month: true }, _max: { month: true } }),
      prisma.member.aggregate({ _min: { joiningDate: true }, _max: { joiningDate: true } }),
      prisma.member.aggregate({ _min: { leavingDate: true }, _max: { leavingDate: true } }),
    ]);

    const earliest = [
      paymentMonths._min.month,
      joiningDates._min.joiningDate ? monthKeyFromInputDate(joiningDates._min.joiningDate.toISOString()) : null,
    ].filter((value): value is string => Boolean(value)).sort()[0];

    const latest = [
      paymentMonths._max.month,
      leavingDates._max.leavingDate ? monthKeyFromInputDate(leavingDates._max.leavingDate.toISOString()) : null,
    ].filter((value): value is string => Boolean(value)).sort().at(-1);

    return selectableMonthKeys(monthWindow({ earliest, latest, padForward }));
  },
);

/**
 * The selectable months as select options, for the payment and member forms.
 *
 * Deliberately the full range: these pickers record a payment, so they have to
 * reach months that do not exist yet.
 */
export const listSelectableMonthOptions = cache(async () =>
  monthSelectOptions(await listSelectableMonths()),
);
/**
 * Seat occupancy for the public landing page.
 *
 * Deliberately narrower than `getRoomsWithSeats`: this reads seat numbers and
 * status and nothing else, because it is served to anyone who opens the site.
 * No member name, mobile, guardian or payment is joined in, so there is nothing
 * here to leak and no reason to be careful about who is asking.
 *
 * Not cached across requests. The landing page advertises this as live, and it
 * is one indexed count over a table the size of a single room, so a short
 * cache would only make the numbers wrong.
 */
export const listPublicOccupancy = cache(async () => {
  const rooms = await prisma.room.findMany({
    select: {
      id: true,
      name: true,
      seats: {
        select: { id: true, seatNumber: true, status: true },
        orderBy: { seatNumber: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return rooms.map((room) => {
    const total = room.seats.length;
    const occupied = room.seats.filter((seat) => seat.status === "OCCUPIED").length;
    return {
      id: room.id,
      name: room.name,
      total,
      occupied,
      open: total - occupied,
      seats: room.seats.map((seat) => ({
        id: seat.id,
        seatNumber: seat.seatNumber,
        occupied: seat.status === "OCCUPIED",
      })),
    };
  });
});

/**
 * What each of the last twelve months collected, newest month first.
 *
 * Paid records only: a pending row is money owed, not money in, so counting it
 * would flatter the chart. Months with nothing are included as zeroes so the
 * bars line up with a real calendar rather than skipping gaps.
 */
export async function getRevenueTrend(through: string): Promise<RevenuePoint[]> {
  const keys = recentMonthKeys(12, through);
  const groups = await prisma.payment.groupBy({
    by: ["month"],
    where: { status: "PAID", month: { in: keys } },
    _sum: { amount: true },
  });
  const byMonth = new Map(groups.map((group) => [group.month, toNumber(group._sum.amount)]));
  return keys.map((month) => ({ month, total: byMonth.get(month) ?? 0 }));
}

export type RevenuePoint = {
  month: string;
  total: number;
};

export type PaymentReminderRow = {
  memberPk: number;
  name: string;
  memberId: string;
  mobile: string | null;
  due: number;
  status: "PENDING" | "NONE";
};

/**
 * Active members who still owe the chosen month.
 *
 * "None" is a real state here: someone who joined on time but has never had a
 * payment generated for the month still owes it, so reminders cover both the
 * explicit PENDING rows and members with no record at all.
 */
export async function listPaymentReminders(month: string): Promise<PaymentReminderRow[]> {
  const summary = await getMonthSummary(month, "ACTIVE");
  return summary
    .filter(
      (row): row is typeof row & { status: "PENDING" | "NONE" } =>
        row.status === "PENDING" || row.status === "NONE",
    )
    .map((row) => ({
      memberPk: row.memberPk,
      name: row.name,
      memberId: row.memberId,
      mobile: row.mobile,
      due: row.due,
      status: row.status,
    }));
}

export type PublicRoomOccupancy = Awaited<ReturnType<typeof listPublicOccupancy>>[number];
