import test from "node:test";
import assert from "node:assert/strict";
import { safeNext } from "./safe-next";

const FALLBACK = "/dashboard";

test("valid same-origin paths are kept, including query and hash", () => {
  assert.equal(safeNext("/"), "/");
  assert.equal(safeNext("/members"), "/members");
  assert.equal(safeNext("/pay?token=abc#top"), "/pay?token=abc#top");
});

test("absolute, protocol-relative and non-string destinations use the fallback", () => {
  for (const value of [
    "https://evil.example/",
    "http://evil.example/",
    "//evil.example/path",
    "///evil.example/path",
    "javascript:alert(1)",
    "",
    "members",
  ]) {
    assert.equal(safeNext(value), FALLBACK, String(value));
  }
  for (const value of [undefined, null, 42, {}, ["/dashboard"]]) {
    assert.equal(safeNext(value), FALLBACK, JSON.stringify(value));
  }
});

test("backslashes and control characters cannot smuggle another host", () => {
  for (const value of [
    "\\evil.example",
    "/\\evil.example",
    "/\\\\evil.example",
    "/dashboard\nLocation: https://evil.example",
  ]) {
    assert.equal(safeNext(value), FALLBACK, value);
  }
});

test("dot segments are normalised without leaving the site", () => {
  assert.equal(safeNext("/members/../payments"), "/payments");
  const encoded = safeNext("/%2f%2fevil.example");
  assert.equal(new URL(encoded, "https://site.test").origin, "https://site.test");
});

test("a caller can choose a different fallback", () => {
  assert.equal(safeNext("//evil.example", "/member"), "/member");
});
