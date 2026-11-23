import assert from "node:assert/strict";
import test from "node:test";
import {
  overdueReminderMessage,
  paymentConfirmationMessage,
  paymentReminderMessage,
} from "./whatsapp";

test("a payment confirmation names the member and the chosen online mode", () => {
  assert.equal(
    paymentConfirmationMessage({
      name: "Mohammad Hussain",
      memberId: "ATN061",
      month: "2026-12",
      amount: 700,
      mode: "ONLINE",
    }),
    "Hi, I am Mohammad Hussain (ATN061). I just paid my library fee for December 2026 (₹700) via NEFT/bank transfer.",
  );
});

test("a cash confirmation says the fee was paid at the library", () => {
  assert.equal(
    paymentConfirmationMessage({
      name: "Mohammad Hussain",
      memberId: "ATN061",
      month: "2026-12",
      amount: 700,
      mode: "CASH",
    }),
    "Hi, I am Mohammad Hussain (ATN061). I just paid my library fee for December 2026 (₹700) in cash at the library.",
  );
});

test("both reminders offer opening hours or online, not WhatsApp", () => {
  const single = paymentReminderMessage({
    name: "Mohammad Hussain",
    due: 700,
    month: "2026-11",
    dueDate: new Date("2026-11-22T00:00:00.000Z"),
  });
  const overdue = overdueReminderMessage({
    name: "Mohammad Hussain",
    months: ["2026-10", "2026-11"],
    totalDue: 1400,
  });

  assert.match(single, /You can pay by visiting us during opening hours or online\./);
  assert.match(overdue, /You can pay by visiting us during opening hours or online\./);
  assert.doesNotMatch(single, /opening hours or on WhatsApp/);
  assert.doesNotMatch(overdue, /opening hours or on WhatsApp/);
});
