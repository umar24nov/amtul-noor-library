import test from "node:test";
import assert from "node:assert/strict";
import { encryptPassword } from "./password-vault";
import {
  canRevealPassword,
  REVEAL_DENIED_MESSAGE,
  REVEAL_UNAVAILABLE_MESSAGE,
  revealPassword,
} from "./password-reveal";

const SECRET = "a-test-secret-that-is-long-enough-to-pass-the-check";

process.env.AUTH_SECRET = SECRET;

test("only a full-access admin may read a password back", () => {
  assert.equal(canRevealPassword("ADMIN"), true);
  assert.equal(canRevealPassword("DAY_TO_DAY"), false);
});

test("a stored password is handed back to a full-access admin", () => {
  const saved = encryptPassword("Sister-2026!");
  const result = revealPassword(saved);
  assert.equal(result.status, "success");
  if (result.status === "success") assert.equal(result.password, "Sister-2026!");
});

test("an account with no stored copy explains that instead of failing", () => {
  const result = revealPassword(null);
  assert.equal(result.status, "error");
  if (result.status === "error") assert.equal(result.message, REVEAL_UNAVAILABLE_MESSAGE);
});

test("a copy that no key fits explains that instead of failing", () => {
  const result = revealPassword("v1.aaaa.bbbb.cccc");
  assert.equal(result.status, "error");
  if (result.status === "error") assert.equal(result.message, REVEAL_UNAVAILABLE_MESSAGE);
});

test("the denial message says who may read a password", () => {
  assert.match(REVEAL_DENIED_MESSAGE, /full-access admin/);
});
