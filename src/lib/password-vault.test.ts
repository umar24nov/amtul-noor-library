import test from "node:test";
import assert from "node:assert/strict";
import { decryptPassword, encryptPassword } from "./password-vault";

const SECRET = "a-test-secret-that-is-long-enough-to-pass-the-check";

// The vault keys off AUTH_SECRET, so the tests use their own value rather than
// whatever the machine happens to have.
process.env.AUTH_SECRET = SECRET;

test("a password comes back exactly as it was saved", () => {
  const saved = encryptPassword("Sister-2026!");
  assert.equal(decryptPassword(saved), "Sister-2026!");
});

test("the same password saved twice reads back differently", () => {
  const first = encryptPassword("same");
  const second = encryptPassword("same");
  assert.notEqual(first, second);
  assert.equal(decryptPassword(first), "same");
  assert.equal(decryptPassword(second), "same");
});

test("nothing saved reads back as nothing", () => {
  assert.equal(decryptPassword(null), null);
  assert.equal(decryptPassword(""), null);
});

test("a tampered payload is not readable", () => {
  const saved = encryptPassword("Sister-2026!");
  const parts = saved.split(".");
  const flipped = Buffer.from(parts[3], "base64");
  flipped[0] ^= 0xff;
  const damaged = [parts[0], parts[1], parts[2], flipped.toString("base64")].join(".");
  assert.equal(decryptPassword(damaged), null);
});

test("a payload from another format is not readable", () => {
  assert.equal(decryptPassword("v0.aaaa.bbbb.cccc"), null);
  assert.equal(decryptPassword("nonsense"), null);
});

test("changing the secret makes the old copy unreadable", () => {
  const saved = encryptPassword("Sister-2026!");
  process.env.AUTH_SECRET = `${SECRET}-changed`;
  assert.equal(decryptPassword(saved), null);
  process.env.AUTH_SECRET = SECRET;
});

test("a copy saved before the vault secret was added is still readable", () => {
  const saved = encryptPassword("Sister-2026!");
  process.env.PASSWORD_VAULT_SECRET = "a-vault-secret-that-is-long-enough-to-pass";
  assert.equal(decryptPassword(saved), "Sister-2026!");
  delete process.env.PASSWORD_VAULT_SECRET;
});

test("a copy saved with the vault secret is readable and needs the vault secret", () => {
  process.env.PASSWORD_VAULT_SECRET = "a-vault-secret-that-is-long-enough-to-pass";
  const saved = encryptPassword("Sister-2026!");
  assert.equal(decryptPassword(saved), "Sister-2026!");
  delete process.env.PASSWORD_VAULT_SECRET;
  assert.equal(decryptPassword(saved), null);
});
