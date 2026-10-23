import test from "node:test";
import assert from "node:assert/strict";
import {
  AUTO_PENDING_REMARK,
  firstPendingMonth,
  isAutoPendingRow,
  joinedMonthKey,
  pendingDueDate,
  prioritiseStatus,
} from "./payments";

/** A joining date as the app stores it: UTC midnight. */
function joined(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

test("the joined month is read in UTC, like every other date in the app", () => {
  assert.equal(joinedMonthKey(joined(2026, 10, 22)), "2026-10");
  assert.equal(joinedMonthKey(joined(2026, 1, 5)), "2026-01");
});

test("the first pending month is the month after joining", () => {
  assert.equal(firstPendingMonth(joined(2026, 10, 22)), "2026-11");
  assert.equal(firstPendingMonth(joined(2026, 1, 5)), "2026-02");
  assert.equal(firstPendingMonth(joined(2026, 12, 31)), "2027-01");
});

test("a pending row is dated on the joining day", () => {
  const due = pendingDueDate("2026-11", joined(2026, 10, 22));
  assert.equal(due.toISOString(), "2026-11-22T00:00:00.000Z");
});

test("the joining day is clamped to a shorter month", () => {
  // Someone who joined on the 31st cannot be due on a 31 February.
  const february = pendingDueDate("2026-02", joined(2026, 1, 31));
  assert.equal(february.toISOString(), "2026-02-28T00:00:00.000Z");

  const leap = pendingDueDate("2028-02", joined(2028, 1, 31));
  assert.equal(leap.toISOString(), "2028-02-29T00:00:00.000Z");
});

test("only a generated pending row is a placeholder", () => {
  assert.equal(
    isAutoPendingRow({ status: "PENDING", remarks: AUTO_PENDING_REMARK }),
    true,
  );
  // A pending row a person wrote by hand is a real record.
  assert.equal(isAutoPendingRow({ status: "PENDING", remarks: "Paid in cash" }), false);
  assert.equal(isAutoPendingRow({ status: "PENDING", remarks: null }), false);
  // A generated row that has been paid is no longer a placeholder.
  assert.equal(isAutoPendingRow({ status: "PAID", remarks: AUTO_PENDING_REMARK }), false);
});

test("the chosen status comes first and every row stays in the list", () => {
  const rows = [
    { id: 1, status: "PAID" as const },
    { id: 2, status: "PENDING" as const },
    { id: 3, status: "PAID" as const },
    { id: 4, status: "PENDING" as const },
  ];

  const prioritised = prioritiseStatus(rows, "PENDING");
  assert.deepEqual(
    prioritised.map((row) => row.id),
    [2, 4, 1, 3],
  );
  // Nothing is dropped: the paid records are below, not gone.
  assert.equal(prioritised.length, rows.length);
});

test("no chosen status leaves the order alone", () => {
  const rows = [
    { id: 1, status: "PAID" as const },
    { id: 2, status: "PENDING" as const },
  ];
  assert.deepEqual(prioritiseStatus(rows, undefined), rows);
});
