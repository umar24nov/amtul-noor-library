import assert from "node:assert/strict";
import test from "node:test";
import { parseFlexibleDate } from "./flexible-date";

function day(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

test("the accepted free-text date shapes still parse", () => {
  assert.equal(day(parseFlexibleDate("2026-03-04")), "2026-03-04");
  assert.equal(day(parseFlexibleDate("04/03/2026")), "2026-03-04");
  assert.equal(day(parseFlexibleDate("04-03-2026")), "2026-03-04");
  assert.equal(day(parseFlexibleDate("03/2026")), "2026-03-01");
  assert.equal(day(parseFlexibleDate("2026/03")), "2026-03-01");
  assert.equal(day(parseFlexibleDate("4 March 2026")), "2026-03-04");
  assert.equal(day(parseFlexibleDate("2024-02-29")), "2024-02-29");
});

test("impossible and unknown dates are rejected instead of becoming today", () => {
  assert.equal(parseFlexibleDate("30/02/2026"), null);
  assert.equal(parseFlexibleDate("31/04/2026"), null);
  assert.equal(parseFlexibleDate("2026-02-30"), null);
  assert.equal(parseFlexibleDate("2026-02-29"), null);
  assert.equal(parseFlexibleDate("31 Feb 2026"), null);
  assert.equal(parseFlexibleDate("13/2026"), null);
  assert.equal(parseFlexibleDate("not a date"), null);
  assert.equal(parseFlexibleDate(""), null);
});
