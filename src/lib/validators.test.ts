import assert from "node:assert/strict";
import test from "node:test";
import { expenseFormSchema } from "./expense-validators";
import { parseInputDate } from "./format";
import { dateInputSchema, monthKeySchema } from "./validators";

test("form dates must be real calendar dates, not just parseable strings", () => {
  assert.equal(dateInputSchema.safeParse("2026-02-30").success, false);
  assert.equal(dateInputSchema.safeParse("2026-02-31").success, false);
  assert.equal(dateInputSchema.safeParse("2026-04-31").success, false);
  assert.equal(dateInputSchema.safeParse("2026-13-01").success, false);
  assert.equal(dateInputSchema.safeParse("2026-2-01").success, false);

  assert.equal(dateInputSchema.safeParse("2026-02-28").success, true);
  assert.equal(dateInputSchema.safeParse("2024-02-29").success, true);
});

test("month keys use one shared pattern", () => {
  assert.equal(monthKeySchema.safeParse("2026-12").success, true);
  assert.equal(monthKeySchema.safeParse("2026-13").success, false);
  assert.equal(monthKeySchema.safeParse("2026-1").success, false);
});

test("parseInputDate refuses impossible dates instead of rolling them forward", () => {
  assert.throws(() => parseInputDate("2026-02-30"), /Invalid date/);
  assert.throws(() => parseInputDate("30-02-2026"), /Invalid date/);
  assert.equal(parseInputDate("2026-03-01").toISOString(), "2026-03-01T00:00:00.000Z");
});

test("expense dates go through the same calendar check", () => {
  const valid = { date: "2026-03-01", amount: 100, purpose: "Books" };
  assert.equal(expenseFormSchema.safeParse(valid).success, true);
  assert.equal(
    expenseFormSchema.safeParse({ ...valid, date: "2026-02-30" }).success,
    false,
  );
});
