import test from "node:test";
import assert from "node:assert/strict";
import { PERMISSION_KEYS, deriveRoleLevel } from "./permission-defs";
import {
  ASSIGN_ADMIN_MESSAGE,
  canAssignLevel,
  canManageLevel,
  MANAGE_ADMIN_MESSAGE,
} from "./user-management";

test("a full admin can manage and hand out every level", () => {
  assert.equal(canManageLevel("ADMIN", "ADMIN"), true);
  assert.equal(canManageLevel("ADMIN", "DAY_TO_DAY"), true);
  assert.equal(canAssignLevel("ADMIN", "ADMIN"), true);
  assert.equal(canAssignLevel("ADMIN", "DAY_TO_DAY"), true);
});

test("a day-to-day manager cannot manage an admin account", () => {
  assert.equal(canManageLevel("DAY_TO_DAY", "ADMIN"), false);
  assert.equal(canManageLevel("DAY_TO_DAY", "DAY_TO_DAY"), true);
});

test("a day-to-day manager cannot hand out full access", () => {
  assert.equal(canAssignLevel("DAY_TO_DAY", "ADMIN"), false);
  assert.equal(canAssignLevel("DAY_TO_DAY", "DAY_TO_DAY"), true);
});

test("both messages say that full access is needed", () => {
  assert.match(MANAGE_ADMIN_MESSAGE, /full-access admin/);
  assert.match(ASSIGN_ADMIN_MESSAGE, /full-access admin/);
});

test("ticking every area still needs a full admin to save or change", () => {
  const fullAccess = deriveRoleLevel([...PERMISSION_KEYS]);
  assert.equal(fullAccess, "ADMIN");
  assert.equal(canAssignLevel("DAY_TO_DAY", fullAccess), false);
  assert.equal(canManageLevel("DAY_TO_DAY", fullAccess), false);
  assert.equal(canAssignLevel("ADMIN", fullAccess), true);
  assert.equal(canManageLevel("ADMIN", fullAccess), true);
});
