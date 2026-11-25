import test from "node:test";
import assert from "node:assert/strict";
import {
  APPLICATION_DRAFT_KEY,
  EMPTY_APPLICATION_DRAFT,
  readApplicationDraft,
  serializeApplicationDraft,
} from "./application-draft";

const filledDraft = {
  ...EMPTY_APPLICATION_DRAFT,
  name: "Asha Khan",
  mobile: "9876543210",
  email: "asha@example.com",
  address: "12 Main Street, Lucknow",
  guardianName: "Rahim Khan",
  guardianMobile: "9123456789",
  preparingFor: "SSC CGL 2027",
  joiningDate: "2026-12-01",
  seatId: "17",
  seatType: "non-locker" as const,
  agreed: true,
};

test("a draft survives a save and read round trip", () => {
  const restored = readApplicationDraft(serializeApplicationDraft(filledDraft));
  assert.deepEqual(restored, filledDraft);
});

test("the draft never stores an Aadhaar number, even if one is passed in", () => {
  const withAadhaar = { ...filledDraft, aadhaarNumber: "123456789012" };
  const serialized = serializeApplicationDraft(withAadhaar as typeof filledDraft);
  assert.equal(JSON.parse(serialized).aadhaarNumber, undefined);

  const restored = readApplicationDraft(
    JSON.stringify({ ...filledDraft, aadhaarNumber: "123456789012" }),
  );
  assert.equal("aadhaarNumber" in restored, false);
});

test("a damaged or older draft falls back to empty fields", () => {
  assert.deepEqual(readApplicationDraft(null), EMPTY_APPLICATION_DRAFT);
  assert.deepEqual(readApplicationDraft("not json"), EMPTY_APPLICATION_DRAFT);
  assert.deepEqual(readApplicationDraft("[]"), EMPTY_APPLICATION_DRAFT);
  assert.deepEqual(
    readApplicationDraft(
      JSON.stringify({
        name: "Asha",
        mobile: 9876543210,
        seatType: "unknown",
        agreed: "yes",
      }),
    ),
    { ...EMPTY_APPLICATION_DRAFT, name: "Asha" },
  );
});

test("draft text is capped to the form limits", () => {
  const oversized = {
    ...EMPTY_APPLICATION_DRAFT,
    name: "a".repeat(200),
    mobile: "9".repeat(40),
  };
  const restored = readApplicationDraft(serializeApplicationDraft(oversized));
  assert.equal(restored.name.length, 80);
  assert.equal(restored.mobile.length, 10);
});

test("the draft key is versioned so an old shape cannot be read", () => {
  assert.match(APPLICATION_DRAFT_KEY, /:v\d+$/);
});
