import test from "node:test";
import assert from "node:assert/strict";
import {
  DAY_TO_DAY_DEFAULTS,
  PERMISSION_GROUPS,
  PERMISSION_KEYS,
  deriveRoleLevel,
  deriveSavedRoleLevel,
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

test("member activity has its own permission, separate from Users", () => {
  assert.ok(PERMISSION_KEYS.includes("MEMBER_ACTIVITY"));
  const administration = PERMISSION_GROUPS.find((group) => group.title === "Administration");
  assert.ok(administration);
  assert.ok(administration.options.some((option) => option.key === "MEMBER_ACTIVITY"));
});

test("the member activity sidebar link uses its own permission", async () => {
  const { NAV_ITEMS } = await import("./constants");
  const item = NAV_ITEMS.find((entry) => entry.href === "/member-activity");
  assert.deepEqual(item?.permissions, ["MEMBER_ACTIVITY"]);
});

test("the role level comes from the selected areas", () => {
  assert.equal(deriveRoleLevel([]), "DAY_TO_DAY");
  assert.equal(deriveRoleLevel(DAY_TO_DAY_DEFAULTS), "DAY_TO_DAY");
  assert.equal(deriveRoleLevel([...PERMISSION_KEYS]), "ADMIN");
  assert.equal(
    deriveRoleLevel(PERMISSION_KEYS.filter((key) => key !== "MEMBER_ACTIVITY")),
    "DAY_TO_DAY",
  );
});

test("every permission is offered in the role editor", () => {
  const offered = PERMISSION_GROUPS.flatMap((group) => group.options.map((option) => option.key));
  assert.deepEqual([...offered].sort(), [...PERMISSION_KEYS].sort());
});

test("saving an existing limited role never elevates it accidentally", () => {
  const all = [...PERMISSION_KEYS];
  assert.equal(deriveSavedRoleLevel("DAY_TO_DAY", all), "DAY_TO_DAY");
  assert.equal(deriveSavedRoleLevel("VIEW_ONLY", all), "DAY_TO_DAY");
  assert.equal(deriveSavedRoleLevel("ADMIN", all), "ADMIN");
  assert.equal(
    deriveSavedRoleLevel("ADMIN", PERMISSION_KEYS.filter((key) => key !== "USERS")),
    "DAY_TO_DAY",
  );
});
