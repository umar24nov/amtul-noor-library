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

/**
 * How far the selectable month window reaches either side of the data. The
 * forward padding is what lets a month be recorded or viewed before it arrives,
 * and the backward padding keeps older months reachable after archiving.
 */
export const MONTH_PAD_BACK = 12;
/**
 * Three years ahead. This is deliberately generous: fees are collected in
 * advance, so the picker must reach well past next month, and it must keep
 * working as the current month moves on without anyone editing this file.
 */
export const MONTH_PAD_FORWARD = 36;

/** Upper bound on the size of a month list, so bad data cannot build a huge one. */
export const MAX_MONTH_WINDOW = 360;

/** Ways the member list can be ordered. The first entry is the default. */
export const MEMBER_SORTS = [
  { value: "status-name", label: "Active first, then name A-Z" },
  { value: "name-asc", label: "Name (A-Z)" },
  { value: "name-desc", label: "Name (Z-A)" },
  { value: "seat", label: "Seat number" },
  { value: "newest", label: "Newest members first" },
  { value: "oldest", label: "Oldest members first" },
  { value: "member-id", label: "Member ID" },
  { value: "recently-updated", label: "Recently updated" },
] as const;

export type MemberSort = (typeof MEMBER_SORTS)[number]["value"];

export const DEFAULT_MEMBER_SORT: MemberSort = "status-name";

export function isMemberSort(value: string | undefined): value is MemberSort {
  return MEMBER_SORTS.some((option) => option.value === value);
}

export const PAGE_SIZE = 12;