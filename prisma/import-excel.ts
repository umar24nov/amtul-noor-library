/**
 * Imports the existing Excel register (Library.xlsx) into the database.
 *
 * Usage:
 *   npm run import            # find Library.xlsx in this folder or one level up
 *   npm run import -- file.xlsx
 *   npm run import -- file.xlsx --force   # wipe existing data first
 *
 * The sheet is organised as one block of columns per month, for example
 * "September" holds a payment mode in one cell and an amount in the next.
 * Those monthly columns become one Payment row each, so nothing is ever
 * overwritten and the history keeps growing.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import "dotenv/config";
import * as XLSX from "xlsx";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  type PaymentMode,
  type PaymentStatus,
} from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/** Column indexes in Sheet1. */
const COL = {
  name: 1,
  status: 2,
  joiningDate: 3,
  seatNumber: 4,
  mobile: 29,
  guardianName: 30,
  guardianMobile: 31,
} as const;

/**
 * Month columns in the order they appear in the sheet, which runs newest to
 * oldest: October, September, ... January, December, November.
 */
const MONTH_COLUMNS: { mode: number; amount: number; name: string }[] = [
  { name: "October", mode: 5, amount: 6 },
  { name: "September", mode: 7, amount: 8 },
  { name: "August", mode: 9, amount: 10 },
  { name: "July", mode: 11, amount: 12 },
  { name: "June", mode: 13, amount: 14 },
  { name: "May", mode: 15, amount: 16 },
  { name: "April", mode: 17, amount: 18 },
  { name: "March", mode: 19, amount: 20 },
  { name: "February", mode: 21, amount: 22 },
  { name: "January", mode: 23, amount: 24 },
  { name: "December", mode: 25, amount: 26 },
  { name: "November", mode: 27, amount: 28 },
];

const MONTH_INDEX: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};

const ROOM_NAME = "Room 1";
const ROOM_SEATS = 22;
const DEFAULT_FEE = 700;

const warnings: string[] = [];

function warn(message: string) {
  if (!warnings.includes(message)) warnings.push(message);
}

/** Repeated header rows that survived blank-row filtering. */
const HEADER_LABELS = new Set(["name", "member", "member name", "names"]);

type Cell = unknown;

function text(cell: Cell): string {
  if (cell === undefined || cell === null) return "";
  if (cell instanceof Date) return cell.toISOString().slice(0, 10);
  return String(cell).trim();
}

function digits(cell: Cell): string {
  return text(cell).replace(/\D/g, "");
}

/** "02", 2 and 2.0 all become "02". */
function seatNumber(cell: Cell): string | null {
  const raw = text(cell);
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return null;
  return String(Math.round(value)).padStart(2, "0");
}

function mobile(cell: Cell): string | null {
  const value = digits(cell);
  if (!value) return null;
  if (!/^[6-9]\d{9}$/.test(value)) {
    warn(`Mobile number "${text(cell)}" is not a valid 10 digit number and was skipped.`);
    return null;
  }
  return value;
}

function joiningDate(cell: Cell): Date | null {
  if (cell instanceof Date && !Number.isNaN(cell.getTime())) {
    return new Date(Date.UTC(cell.getUTCFullYear(), cell.getUTCMonth(), cell.getUTCDate()));
  }
  const value = text(cell);
  if (!value) return null;
  // Excel serial day count, used when a date cell is read as a plain number.
  if (/^\d+(\.\d+)?$/.test(value)) {
    const serial = Number(value);
    if (serial > 20000 && serial < 80000) {
      const ms = Math.round((serial - 25569) * 86_400_000);
      return new Date(ms);
    }
  }
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
  }
  return null;
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function firstOfMonth(key: string): Date {
  return new Date(`${key}-01T00:00:00.000Z`);
}

/**
 * Works out which year each month column belongs to by anchoring the leftmost
 * column (October) to the most recent October that is not in the future.
 */
function buildMonthKeys(now = new Date()): Map<string, string> {
  const newestIndex = MONTH_INDEX[MONTH_COLUMNS[0].name.toLowerCase()];
  let anchorYear = now.getFullYear();
  if (newestIndex + 1 > now.getMonth() + 1) anchorYear -= 1;

  const anchor = new Date(Date.UTC(anchorYear, newestIndex, 1));
  const keys = new Map<string, string>();
  MONTH_COLUMNS.forEach((column, position) => {
    const date = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - position, 1));
    keys.set(column.name.toLowerCase(), monthKey(date));
  });
  return keys;
}

type ParsedPayment = {
  month: string;
  amount: number;
  paymentMode: PaymentMode;
  status: PaymentStatus;
  remarks: string | null;
};

/** Turns one month's mode/amount pair into a payment, or null when nothing was recorded. */
function parsePayment(
  modeCell: Cell,
  amountCell: Cell,
  month: string,
  memberName: string,
): ParsedPayment | null {
  const rawMode = text(modeCell);
  const rawAmount = text(amountCell);

  if (!rawMode) return null;
  const mode = rawMode.toLowerCase();

  // Nothing was written for this month: not recorded, not applicable or on hold.
  if (["nr", "na", "n/a", "inactive", "-", "–", ""].includes(mode)) return null;

  if (mode.startsWith("offer")) {
    return {
      month,
      amount: 0,
      paymentMode: "OFFER",
      status: "PAID",
      remarks: "Offer / Discount",
    };
  }

  const amount = Number(rawAmount);
  if (!Number.isFinite(amount) || amount <= 0) {
    warn(
      `${memberName}: ${month} says "${rawMode}" with no usable amount, so it was not imported.`,
    );
    return null;
  }

  const paymentMode: PaymentMode = mode === "cash" ? "CASH" : "ONLINE";
  return { month, amount, paymentMode, status: "PAID", remarks: null };
}

/**
 * Finds the register workbook. An explicit path or IMPORT_FILE always wins.
 * Otherwise look in the project folder first, then one level up, which is where
 * the register sits when this repo is checked out inside the library folder.
 */
function resolveRegister(explicit?: string): string {
  if (explicit) {
    const given = path.resolve(explicit);
    if (!existsSync(given)) {
      throw new Error(`No such file: ${given}`);
    }
    return given;
  }

  const candidates = [
    path.join(process.cwd(), "Library.xlsx"),
    path.join(process.cwd(), "..", "Library.xlsx"),
  ];
  const found = candidates.map((file) => path.resolve(file)).find((file) => existsSync(file));

  if (!found) {
    throw new Error(
      [
        "Could not find Library.xlsx.",
        `Looked in:\n  ${candidates.map((file) => path.resolve(file)).join("\n  ")}`,
        "Copy the register into the project folder, or pass it explicitly:",
        "  npm run import -- path/to/Library.xlsx",
      ].join("\n"),
    );
  }

  return found;
}

async function main() {
  const args = process.argv.slice(2);
  const fileArg = args.find((arg) => !arg.startsWith("--"));
  const force = args.includes("--force");
  const filePath = resolveRegister(fileArg ?? process.env.IMPORT_FILE);

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env first.");
  }

  const existing = await prisma.member.count();
  if (existing > 0 && !force) {
    throw new Error(
      `The database already has ${existing} members. Re-run with --force to replace all data.`,
    );
  }

  console.log(`Reading ${filePath}`);
  const workbook = XLSX.read(readFileSync(filePath), { cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error("The workbook has no sheets.");
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    blankrows: false,
    raw: true,
  }) as unknown as Cell[][];

  const monthKeys = buildMonthKeys();
  console.log("Month columns resolved to:");
  for (const column of MONTH_COLUMNS) {
    console.log(`  ${column.name.padEnd(10)} -> ${monthKeys.get(column.name.toLowerCase())}`);
  }

  if (force) {
    console.log("Clearing existing data…");
    await prisma.$transaction([
      prisma.payment.deleteMany(),
      prisma.member.deleteMany(),
      prisma.seat.deleteMany(),
      prisma.room.deleteMany(),
    ]);
  }

  const room = await prisma.room.upsert({
    where: { name: ROOM_NAME },
    update: {},
    create: { name: ROOM_NAME },
  });

  const existingSeats = await prisma.seat.findMany({ where: { roomId: room.id } });
  const highestSeat = existingSeats.reduce(
    (max, seat) => Math.max(max, Number(seat.seatNumber) || 0),
    0,
  );
  const missingSeats: { roomId: number; seatNumber: string }[] = [];
  for (let number = 1; number <= Math.max(ROOM_SEATS, highestSeat); number += 1) {
    const padded = String(number).padStart(2, "0");
    if (!existingSeats.some((seat) => seat.seatNumber === padded)) {
      missingSeats.push({ roomId: room.id, seatNumber: padded });
    }
  }
  if (missingSeats.length > 0) {
    await prisma.seat.createMany({ data: missingSeats, skipDuplicates: true });
    console.log(`Created ${missingSeats.length} seats in ${ROOM_NAME}.`);
  }

  const allSeats = await prisma.seat.findMany({ where: { roomId: room.id } });
  const seatByNumber = new Map(allSeats.map((seat) => [seat.seatNumber, seat]));
  const occupiedSeats = new Set<number>();
  const mobileUsage = new Map<string, string[]>();
  const seatConflicts: string[] = [];

  let memberCounter = 0;
  let paymentCounter = 0;
  let paymentTotal = 0;
  const skippedRows: string[] = [];

  for (const row of rows) {
    const name = text(row[COL.name]);
    if (!name || HEADER_LABELS.has(name.toLowerCase())) continue;

    const status = text(row[COL.status]).toLowerCase();
    const isActive = status !== "inactive" && status !== "left" && status !== "discontinued";

    const payments: ParsedPayment[] = [];
    for (const column of MONTH_COLUMNS) {
      const parsed = parsePayment(
        row[column.mode],
        row[column.amount],
        monthKeys.get(column.name.toLowerCase())!,
        name,
      );
      if (parsed) payments.push(parsed);
    }

    const rowSeat = seatNumber(row[COL.seatNumber]);
    let date = joiningDate(row[COL.joiningDate]);
    if (!date && payments.length > 0) {
      const earliest = [...payments].sort((a, b) => a.month.localeCompare(b.month))[0];
      date = firstOfMonth(earliest.month);
      warn(`${name}: no joining date in the sheet, using ${earliest.month}.`);
    }
    if (!date) {
      skippedRows.push(`${name} (no joining date and no payments)`);
      continue;
    }

    const memberMobile = mobile(row[COL.mobile]);
    const guardianMobileValue = mobile(row[COL.guardianMobile]);

    // Only one active member may hold a seat.
    let seatId: number | null = null;
    if (rowSeat && isActive) {
      const seat = seatByNumber.get(rowSeat);
      if (!seat) {
        warn(`${name}: seat ${rowSeat} does not exist, so no seat was assigned.`);
      } else if (occupiedSeats.has(seat.id)) {
        seatConflicts.push(`${name} wanted seat ${rowSeat}, which was already taken.`);
      } else {
        seatId = seat.id;
      }
    }

    memberCounter += 1;
    const memberId = `ATN${String(memberCounter).padStart(3, "0")}`;

    const joinedMonth = monthKey(date);
    const validPayments = payments.filter((payment) => payment.month >= joinedMonth);
    if (validPayments.length !== payments.length) {
      warn(
        `${name}: ${payments.length - validPayments.length} payment month(s) before the joining date were skipped.`,
      );
    }

    await prisma.member.create({
      data: {
        memberId,
        name,
        mobile: memberMobile,
        guardianName: text(row[COL.guardianName]) || null,
        guardianMobile: guardianMobileValue,
        joiningDate: date,
        remarks: null,
        status: isActive ? "ACTIVE" : "LEFT",
        leavingDate: isActive ? null : new Date(),
        seatId,
        payments: {
          create: validPayments.map((payment) => {
            paymentCounter += 1;
            paymentTotal += payment.amount;
            return {
              paymentId: `PAY${String(paymentCounter).padStart(4, "0")}`,
              month: payment.month,
              amount: payment.amount,
              paymentMode: payment.paymentMode,
              status: payment.status,
              paymentDate:
                payment.month === joinedMonth ? date : firstOfMonth(payment.month),
              remarks: payment.remarks,
            };
          }),
        },
      },
    });

    if (seatId !== null) {
      occupiedSeats.add(seatId);
      await prisma.seat.update({ where: { id: seatId }, data: { status: "OCCUPIED" } });
    }
    if (memberMobile) {
      const existingNames = mobileUsage.get(memberMobile) ?? [];
      existingNames.push(`${memberId} ${name}`);
      mobileUsage.set(memberMobile, existingNames);
    }
  }

  await prisma.setting.upsert({
    where: { key: "monthlyFee" },
    update: { value: String(DEFAULT_FEE) },
    create: { key: "monthlyFee", value: String(DEFAULT_FEE) },
  });

  const [members, seats, paymentRows] = await Promise.all([
    prisma.member.count(),
    prisma.seat.count(),
    prisma.payment.count(),
  ]);

  console.log("");
  console.log("Import finished");
  console.log(`  Room           : ${ROOM_NAME} with ${seats} seats`);
  console.log(`  Members        : ${members}`);
  console.log(`  Payment records: ${paymentRows}`);
  console.log(`  Money recorded : Rs ${paymentTotal}`);
  console.log(`  Monthly fee    : Rs ${DEFAULT_FEE}`);

  if (skippedRows.length > 0) {
    console.log("");
    console.log("Rows skipped (fix these in the app if you need them):");
    for (const row of skippedRows) console.log(`  - ${row}`);
  }

  if (seatConflicts.length > 0) {
    console.log("");
    console.log("Seat conflicts — these members were imported without a seat:");
    for (const conflict of seatConflicts) console.log(`  - ${conflict}`);
  }

  const duplicateMobiles = [...mobileUsage.entries()].filter(([, names]) => names.length > 1);
  if (duplicateMobiles.length > 0) {
    console.log("");
    console.log("Mobile numbers used by more than one member (both were kept):");
    for (const [number, names] of duplicateMobiles) {
      console.log(`  - ${number}: ${names.join(" | ")}`);
    }
  }

  if (warnings.length > 0) {
    console.log("");
    console.log(`Notes (${warnings.length}):`);
    for (const message of warnings) console.log(`  - ${message}`);
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });