import assert from "node:assert/strict";
import test from "node:test";
import {
  memberCanUsePortal,
  memberPortalCookieAllowed,
  memberPortalCredentialsMatch,
} from "./member-portal-access";
import {
  memberPortalAccessSchema,
  memberPortalVerifySchema,
  memberSelfEditSchema,
} from "./validators";

test("member portal access normalises the saved email and validates the member ID", () => {
  const parsed = memberPortalAccessSchema.parse({
    memberId: " atn003 ",
    email: "  Arshad@Example.com ",
  });

  assert.equal(parsed.memberId, "atn003");
  assert.equal(parsed.email, "arshad@example.com");
});

test("member portal access rejects bad identifiers, emails and codes", () => {
  assert.equal(memberPortalAccessSchema.safeParse({ memberId: "", email: "x@y.com" }).success, false);
  assert.equal(
    memberPortalAccessSchema.safeParse({ memberId: "ATN 003", email: "x@y.com" }).success,
    false,
  );
  assert.equal(
    memberPortalVerifySchema.safeParse({ memberId: "ATN003", email: "x@y.com", code: "12ab56" })
      .success,
    false,
  );
  assert.equal(
    memberPortalVerifySchema.safeParse({ memberId: "ATN003", email: "x@y.com", code: "123456" })
      .success,
    true,
  );
});

test("member self-edit never carries staff-managed fields", () => {
  const parsed = memberSelfEditSchema.parse({
    payToken: "ae5ae67d8f4540b297856911466957a9",
    name: "Arshad Ali",
    mobile: "9876543210",
    guardianName: "Noor Alam",
    guardianMobile: "9123456789",
    seatId: 23,
    monthlyFee: 0,
    joiningDate: "2024-01-01",
    status: "ACTIVE",
    remarks: "trusted",
  });

  assert.deepEqual(Object.keys(parsed).sort(), [
    "guardianMobile",
    "guardianName",
    "mobile",
    "name",
    "payToken",
  ]);
});

test("only an active member can sign in with the saved email", () => {
  const details = {
    savedEmail: "Arshad@Example.com",
    enteredEmail: "arshad@example.com",
    savedPayToken: "ae5ae67d8f4540b297856911466957a9",
  };

  assert.equal(memberCanUsePortal("ACTIVE"), true);
  assert.equal(memberCanUsePortal("LEFT"), false);
  assert.equal(memberCanUsePortal(null), false);
  assert.equal(memberPortalCredentialsMatch({ status: "ACTIVE", ...details }), true);
  assert.equal(memberPortalCredentialsMatch({ status: "LEFT", ...details }), false);
  assert.equal(
    memberPortalCredentialsMatch({ status: "ACTIVE", ...details, savedPayToken: null }),
    false,
  );
});

test("a left member's existing portal cookie no longer opens their pages", () => {
  const expected = { memberId: 7, payToken: "ae5ae67d8f4540b297856911466957a9" };
  const access = { memberId: 7, payToken: expected.payToken };

  assert.equal(memberPortalCookieAllowed({ status: "ACTIVE", access, expected }), true);
  assert.equal(memberPortalCookieAllowed({ status: "LEFT", access, expected }), false);
  assert.equal(
    memberPortalCookieAllowed({
      status: "ACTIVE",
      access,
      expected: { ...expected, payToken: "someone-elses-token" },
    }),
    false,
  );
  assert.equal(
    memberPortalCookieAllowed({ status: "ACTIVE", access: null, expected }),
    false,
  );
});
