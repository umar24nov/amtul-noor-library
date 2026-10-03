import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/ids";
import type { PaymentMode, PaymentStatus } from "@/generated/prisma/enums";

/** Which records to export. An empty month means every month. */
export type ExportFilters = {
  month?: string;
  memberId?: string;
  mode?: PaymentMode | "ALL";
  status?: PaymentStatus | "ALL";
};

export type ExportRow = {
  paymentId: string;
  memberId: string;
  memberName: string;
  mobile: string | null;
  roomName: string | null;
  seatNumber: string | null;
  month: string;
  amount: number;
  mode: PaymentMode;
  status: PaymentStatus;
  paymentDate: Date;
  remarks: string | null;
};

export type ExportResult = {
  rows: ExportRow[];
  totals: {
    records: number;
    amount: number;
    paid: number;
    pending: number;
    waived: number;
    onHold: number;
  };
  byMonth: { month: string; records: number; amount: number }[];
  byMode: { mode: PaymentMode; records: number; amount: number }[];
  byStatus: { status: PaymentStatus; records: number; amount: number }[];
};

/**
 * Reads payments for export. Unlike listPayments this ignores pagination, so the
 * spreadsheet always covers every matching record.
 */
export async function getPaymentsForExport(filters: ExportFilters): Promise<ExportResult> {
  const { month, memberId, mode, status } = filters;

  const payments = await prisma.payment.findMany({
    where: {
      ...(month ? { month } : {}),
      ...(memberId ? { member: { memberId } } : {}),
      ...(mode && mode !== "ALL" ? { paymentMode: mode } : {}),
      ...(status && status !== "ALL" ? { status } : {}),
    },
    include: {
      member: {
        include: { seat: { include: { room: true } } },
      },
    },
    orderBy: [{ month: "desc" }, { id: "desc" }],
  });

  const rows: ExportRow[] = payments.map((payment) => ({
    paymentId: payment.paymentId,
    memberId: payment.member.memberId,
    memberName: payment.member.name,
    mobile: payment.member.mobile,
    roomName: payment.member.seat?.room.name ?? null,
    seatNumber: payment.member.seat?.seatNumber ?? null,
    month: payment.month,
    amount: toNumber(payment.amount),
    mode: payment.paymentMode,
    status: payment.status,
    paymentDate: payment.paymentDate,
    remarks: payment.remarks,
  }));

  const sum = (list: ExportRow[]) => list.reduce((total, row) => total + row.amount, 0);
  const byStatusValue = (value: PaymentStatus) =>
    sum(rows.filter((row) => row.status === value));

  const groupTotals = <T extends string>(key: (row: ExportRow) => T) => {
    const map = new Map<T, { records: number; amount: number }>();
    for (const row of rows) {
      const value = key(row);
      const entry = map.get(value) ?? { records: 0, amount: 0 };
      entry.records += 1;
      entry.amount += row.amount;
      map.set(value, entry);
    }
    return map;
  };

  const byMonthMap = groupTotals((row) => row.month);
  const byModeMap = groupTotals((row) => row.mode);
  const byStatusMap = groupTotals((row) => row.status);

  return {
    rows,
    totals: {
      records: rows.length,
      amount: sum(rows),
      paid: byStatusValue("PAID"),
      pending: byStatusValue("PENDING"),
      waived: byStatusValue("WAIVED"),
      onHold: byStatusValue("ON_HOLD"),
    },
    byMonth: [...byMonthMap.entries()]
      .map(([month, value]) => ({ month, ...value }))
      .sort((a, b) => b.month.localeCompare(a.month)),
    byMode: [...byModeMap.entries()].map(([mode, value]) => ({ mode, ...value })),
    byStatus: [...byStatusMap.entries()].map(([s, value]) => ({ status: s, ...value })),
  };
}

export type MemberExportRow = {
  memberId: string;
  name: string;
  mobile: string | null;
  status: string;
  roomName: string | null;
  seatNumber: string | null;
  joiningDate: Date | null;
  leavingDate: Date | null;
  payments: number;
  paid: number;
};

export async function getMembersForExport(): Promise<MemberExportRow[]> {
  const members = await prisma.member.findMany({
    include: {
      seat: { include: { room: true } },
      payments: { select: { amount: true, status: true } },
    },
    orderBy: { memberId: "asc" },
  });

  return members.map((member) => ({
    memberId: member.memberId,
    name: member.name,
    mobile: member.mobile,
    status: member.status,
    roomName: member.seat?.room.name ?? null,
    seatNumber: member.seat?.seatNumber ?? null,
    joiningDate: member.joiningDate,
    leavingDate: member.leavingDate,
    payments: member.payments.length,
    paid: member.payments
      .filter((payment) => payment.status === "PAID")
      .reduce((total, payment) => total + toNumber(payment.amount), 0),
  }));
}

export type SeatExportRow = {
  room: string;
  seatNumber: string;
  status: string;
  memberId: string | null;
  memberName: string | null;
  mobile: string | null;
  joiningDate: Date | null;
};

export async function getSeatsForExport(): Promise<SeatExportRow[]> {
  const seats = await prisma.seat.findMany({
    include: {
      room: true,
      // occupants is the list of members on this seat, so there is nothing to nest.
      occupants: { where: { status: "ACTIVE" } },
    },
    orderBy: [{ room: { name: "asc" } }, { seatNumber: "asc" }],
  });

  return seats.map((seat) => {
    const occupant = seat.occupants[0];
    return {
      room: seat.room.name,
      seatNumber: seat.seatNumber,
      status: seat.status,
      memberId: occupant?.memberId ?? null,
      memberName: occupant?.name ?? null,
      mobile: occupant?.mobile ?? null,
      joiningDate: occupant?.joiningDate ?? null,
    };
  });
}