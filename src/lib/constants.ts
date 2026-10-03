import type {
  MemberStatus,
  PaymentMode,
  PaymentStatus,
  SeatStatus,
} from "@/generated/prisma/enums";

export const LIBRARY_NAME = "Amtul Noor Library";
export const LIBRARY_TAGLINE = "Your Gateway to Knowledge and Success";
export const MEMBER_ID_PREFIX = "ATN";
export const PAYMENT_ID_PREFIX = "PAY";

/** Seat numbers are always stored zero padded to two digits, e.g. "03". */
export const SEAT_PAD = 2;

export const DEFAULT_MONTHLY_FEE = "700";

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export const MONTH_OPTIONS = MONTH_NAMES.map((name, index) => ({
  value: `${String(index + 1).padStart(2, "0")}`,
  label: name,
}));

export const memberStatusLabels: Record<MemberStatus, string> = {
  ACTIVE: "Active",
  LEFT: "Left",
};

export const seatStatusLabels: Record<SeatStatus, string> = {
  AVAILABLE: "Available",
  OCCUPIED: "Occupied",
};

export const paymentModeLabels: Record<PaymentMode, string> = {
  CASH: "Cash",
  ONLINE: "Online",
  OFFER: "Offer / Discount",
};

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  PAID: "Paid",
  PENDING: "Pending",
  WAIVED: "Waived",
  NOT_APPLICABLE: "Not applicable",
  ON_HOLD: "On hold",
};

/** Short descriptions shown in the UI so the extra states are self explanatory. */
export const paymentStatusHelp: Record<PaymentStatus, string> = {
  PAID: "Money received for this month.",
  PENDING: "Due for this month, not received yet.",
  WAIVED: "Given as a free month or discount.",
  NOT_APPLICABLE: "Member had not joined yet, so no fee applies.",
  ON_HOLD: "Member was away this month, payment held.",
};

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/members", label: "Members" },
  { href: "/payments", label: "Payments" },
  { href: "/seats", label: "Seats" },
] as const;

export const PAGE_SIZE = 12;