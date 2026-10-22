import test from "node:test";
import assert from "node:assert/strict";
import {
  PERMISSION_GROUPS,
  PERMISSION_KEYS,
  effectivePermissions,
  roleCanEditPayments,
  roleCanViewPayments,
} from "./permission-defs";

test("the read-only payments permission is offered to the owner", () => {
  assert.ok(PERMISSION_KEYS.includes("PAYMENTS_VIEW"));
  const money = PERMISSION_GROUPS.find((group) => group.title === "Money");
  assert.ok(money);
  assert.ok(money.options.some((option) => option.key === "PAYMENTS_VIEW"));
});

test("a viewer may look at the payments but not change them", () => {
  assert.equal(roleCanViewPayments("DAY_TO_DAY", ["PAYMENTS_VIEW"]), true);
  assert.equal(roleCanEditPayments("DAY_TO_DAY", ["PAYMENTS_VIEW"]), false);
});

test("the full payments permission may do both", () => {
  assert.equal(roleCanViewPayments("DAY_TO_DAY", ["PAYMENTS"]), true);
  assert.equal(roleCanEditPayments("DAY_TO_DAY", ["PAYMENTS"]), true);
});

test("a role without payments may not open the area", () => {
  assert.equal(roleCanViewPayments("DAY_TO_DAY", ["MEMBERS"]), false);
  assert.equal(roleCanEditPayments("DAY_TO_DAY", ["MEMBERS"]), false);
});

test("a full admin may look at and change the payments", () => {
  assert.equal(roleCanViewPayments("ADMIN", []), true);
  assert.equal(roleCanEditPayments("ADMIN", []), true);
});

test("a full admin is given every permission, the new one included", () => {
  assert.deepEqual(effectivePermissions("ADMIN", []), [...PERMISSION_KEYS]);
});
