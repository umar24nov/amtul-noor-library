import test from "node:test";
import assert from "node:assert/strict";
import { deriveMonthStatus, summarizeArrears } from "./fees";
import { monthKeyRange, recentMonthKeys, shiftMonthKey } from "./format";
import type { PaymentStatus } from "@/generated/prisma/enums";

function row(status: PaymentStatus) {
  return { status };
}

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
