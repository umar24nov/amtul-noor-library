import test from "node:test";
import assert from "node:assert/strict";
import { deriveMonthStatus, summarizeArrears } from "./fees";
import { monthKeyRange, normalizeSeatNumber, recentMonthKeys, shiftMonthKey } from "./format";
import {
  LOCKER_SEAT_START,
  monthlyFeeForSeat,
  PLAIN_SEAT_COUNT,
  prepaidPriceForSeat,
  SEAT_COUNT,
  seatHasLocker,
} from "./constants";
import { layoutForSeatNumber, SEAT_LAYOUTS } from "./seat-layouts";
import type { PaymentStatus } from "@/generated/prisma/enums";

function row(status: PaymentStatus) {
  return { status };
}

test("seat type sets the monthly fee and the 3+1 prepaid total", () => {
  assert.equal(monthlyFeeForSeat(false), 700);
  assert.equal(monthlyFeeForSeat(true), 800);
  assert.equal(prepaidPriceForSeat(false), 2100);
  assert.equal(prepaidPriceForSeat(true), 2400);
});

test("seat numbers are always plain, without zero padding", () => {
  assert.equal(normalizeSeatNumber("01"), "1");
  assert.equal(normalizeSeatNumber("22"), "22");
  assert.equal(normalizeSeatNumber(" 023 "), "23");
  assert.equal(normalizeSeatNumber(44), "44");
});

test("seat 22 is plain and seat 23 is the first with a locker", () => {
  assert.equal(LOCKER_SEAT_START, PLAIN_SEAT_COUNT + 1);
  assert.equal(SEAT_COUNT, 44);
  assert.equal(seatHasLocker("22"), false);
  assert.equal(seatHasLocker(22), false);
  assert.equal(seatHasLocker("23"), true);
  assert.equal(seatHasLocker(44), true);
  assert.equal(monthlyFeeForSeat(seatHasLocker("22")), 700);
  assert.equal(monthlyFeeForSeat(seatHasLocker("23")), 800);
});

test("the two seat maps cover seats 1-44 exactly once", () => {
  assert.equal(layoutForSeatNumber(22).key, "plain");
  assert.equal(layoutForSeatNumber(23).key, "locker");

  const mapped = Object.values(SEAT_LAYOUTS).flatMap((layout) =>
    layout.seats.map((seat) => seat.number),
  );
  assert.equal(mapped.length, SEAT_COUNT);
  assert.deepEqual(
    [...mapped].sort((a, b) => a - b),
    Array.from({ length: SEAT_COUNT }, (_, index) => index + 1),
  );
});

test("month keys move across a year boundary", () => {
  assert.equal(shiftMonthKey("2026-01", -1), "2025-12");
  assert.equal(shiftMonthKey("2025-12", 1), "2026-01");
  assert.equal(shiftMonthKey("2026-10", -12), "2025-10");
});

test("recentMonthKeys returns the newest month first", () => {
  assert.deepEqual(recentMonthKeys(3, "2026-02"), ["2026-02", "2026-01", "2025-12"]);
});

test("monthKeyRange includes both ends and rolls the year", () => {
  assert.deepEqual(monthKeyRange("2025-11", "2026-02"), [
    "2025-11",
    "2025-12",
    "2026-01",
    "2026-02",
  ]);
});

test("a paid month wins over any other row recorded beside it", () => {
  assert.equal(
    deriveMonthStatus([row("PENDING"), row("PAID"), row("ON_HOLD")], false),
    "PAID",
  );
});

test("a waived month is not owed", () => {
  assert.equal(deriveMonthStatus([row("WAIVED")], false), "WAIVED");
});

test("a month before the joining month is not applicable", () => {
  assert.equal(deriveMonthStatus([], true), "NOT_APPLICABLE");
});

test("months with no record are owed, like pending months", () => {
  const summary = summarizeArrears({
    fee: 700,
    joiningDate: "2025-12-15T00:00:00.000Z",
    months: ["2026-01", "2026-02", "2026-03"],
    paymentsByMonth: new Map([
      ["2026-01", [row("PAID")]],
      ["2026-02", [row("PENDING")]],
    ]),
  });

  assert.deepEqual(summary.months, ["2026-02", "2026-03"]);
  assert.equal(summary.totalDue, 1400);
});

test("a member's own fee is used for every owed month", () => {
  const summary = summarizeArrears({
    fee: 450,
    joiningDate: "2025-10-01T00:00:00.000Z",
    months: ["2026-01", "2026-02", "2026-03"],
    paymentsByMonth: new Map(),
  });

  assert.deepEqual(summary.months, ["2026-01", "2026-02", "2026-03"]);
  assert.equal(summary.totalDue, 1350);
});

test("paid, waived, held and not-applicable months are skipped", () => {
  const summary = summarizeArrears({
    fee: 800,
    joiningDate: "2025-10-01T00:00:00.000Z",
    months: ["2026-01", "2026-02", "2026-03", "2026-04"],
    paymentsByMonth: new Map([
      ["2026-01", [row("PAID")]],
      ["2026-02", [row("WAIVED")]],
      ["2026-03", [row("ON_HOLD")]],
      ["2026-04", [row("NOT_APPLICABLE")]],
    ]),
  });

  assert.deepEqual(summary.months, []);
  assert.equal(summary.totalDue, 0);
});

test("months before joining are never counted as arrears", () => {
  const summary = summarizeArrears({
    fee: 700,
    joiningDate: "2026-02-10T00:00:00.000Z",
    months: ["2026-01", "2026-02", "2026-03"],
    paymentsByMonth: new Map(),
  });

  assert.deepEqual(summary.months, ["2026-02", "2026-03"]);
  assert.equal(summary.totalDue, 1400);
});
