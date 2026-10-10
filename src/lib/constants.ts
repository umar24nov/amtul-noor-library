import type {
  MemberStatus,
  PaymentMode,
  PaymentStatus,
  SeatStatus,
} from "@/generated/prisma/enums";

export const LIBRARY_NAME = "Amtul Noor Library";
export const LIBRARY_TAGLINE = "Your Gateway to Knowledge and Success";

/**
 * The library's UPI address, used to build `upi://` payment links and shown
 * next to the QR so a member can pay a fee from their phone.
 *
 * This is the address actually encoded in the owner's bank-generated QR
 * (`UPI QR.jpeg`, served at `LIBRARY_UPI_QR_PATH`). The display name shown to
 * the payer comes from `LIBRARY_UPI_NAME`. The pay sections are hidden until
 * the address is set.
 */
export const LIBRARY_UPI_ID = "8273306126@ibl";
export const LIBRARY_UPI_NAME = LIBRARY_NAME;

/** The owner's own UPI QR image, shown wherever a fee can be paid by UPI. */
export const LIBRARY_UPI_QR_PATH = "/upi-qr.jpg";

/** Where the library is, as written on the sign outside it. */
export const LIBRARY_ADDRESS =
  "Rampur Chungi, Eidgah Enclave, Farukh Colony, Purani Tehsil, Roorkee, Uttarakhand 247667";

/**
 * The owner's own Google Maps short link.
 *
 * This is what the landing page links to when someone taps the map. A short
 * link is preferred over a plain search URL because it lands on the exact pin
 * rather than on a search for the street name.
 */
export const LIBRARY_MAPS_URL = "https://maps.app.goo.gl/rsakEZxavT21S8C16";

/**
 * The library's main number. Every WhatsApp link, call button and mention of a
 * number on the public site uses this one.
 */
export const LIBRARY_PHONE = "8273306126";

/**
 * A second number, listed so anyone who cannot get through on the main line
 * still has one. Not a WhatsApp link: only the main number is answered there,
 * so offering a chat that goes nowhere would be worse than showing no button.
 */
export const LIBRARY_PHONE_ALT = "9389632856";

/**
 * Tap to open a chat with the main number. `wa.me` needs the number in
 * international form with no `+`, `0` or spaces, so the country code goes on
 * here rather than at every call site.
 */
export const LIBRARY_WHATSAPP_URL = `https://wa.me/91${LIBRARY_PHONE}`;

/** `tel:` link, which wants the number in international form too. */
export const LIBRARY_PHONE_URL = `tel:+91${LIBRARY_PHONE}`;
export const LIBRARY_PHONE_ALT_URL = `tel:+91${LIBRARY_PHONE_ALT}`;

/** The library's email address, for people who prefer writing to calling. */
export const LIBRARY_EMAIL = "amtulnoorlibrary@gmail.com";
export const LIBRARY_EMAIL_URL = `mailto:${LIBRARY_EMAIL}`;

/** When the reading room is open. Shown to the public, so it is a real answer. */
export const LIBRARY_HOURS = "7:00 AM – 12:00 PM";
export const LIBRARY_HOURS_DAYS = "Open every day";

/**
 * Membership fees, in rupees per month.
 *
 * `locker` is not a separate plan so much as the same seat with storage, and
 * only one room has lockers, so it is priced as an addition to the base fee
 * rather than as its own tier.
 */
export const LIBRARY_FEES = {
  /** A seat, to read and study at. */
  seat: 700,
  /** The same seat in the room that has lockers, so books can stay overnight. */
  seatWithLocker: 800,
} as const;

/**
 * Pay three months up front and the fourth is free.
 *
 * Worth stating plainly on the page, because a member who is told "one month
 * free" and then billed four months is right to be annoyed.
 */
export const LIBRARY_PREPAID_OFFER = {
  paidMonths: 3,
  freeMonths: 1,
  totalMonths: 4,
} as const;

/** What the prepaid offer costs, worked out rather than written by hand. */
export const LIBRARY_PREPAID_PRICE =
  LIBRARY_FEES.seat * LIBRARY_PREPAID_OFFER.paidMonths;

export const MEMBER_ID_PREFIX = "ATN";
export const PAYMENT_ID_PREFIX = "PAY";

/** Seat numbers are always stored zero padded to two digits, e.g. "03". */
export const SEAT_PAD = 2;

export const DEFAULT_MONTHLY_FEE = "700";

/**
 * The rules shown on the join form, directly above the "I agree" tick. Share
 * the wording with the printed board / the old Google Form so the two never
 * drift apart. To change a rule, edit the text here and push.
 */
export const LIBRARY_RULES = [
  "I will maintain silence inside the library at all times.",
  "I will show respect and courtesy to all fellow learners and avoid any behavior that may cause disturbance, discomfort, or harassment.",
  "I will not litter, stand unnecessarily, or form groups in or around the library premises.",
  "I will respect the privacy and personal space of all learners.",
  "I understand that the library and its premises are monitored by CCTV for safety and security.",
  "I will use the library Wi-Fi only for academic and research purposes. Accessing social media, streaming, gaming, or inappropriate content is strictly prohibited.",
  "I will not share my Wi-Fi credentials with others.",
  "I will take proper care of library property (tables, chairs, equipment, internet facilities) and return everything to its proper place before leaving.",
  "Smoking, drinking, or creating any disturbance inside or near the library premises is strictly prohibited.",
  "I understand that library membership is non-transferable and the membership fee is non-refundable.",
  "I accept that serious or repeated violations of these rules may be reported to authorities and may result in suspension or cancellation of membership.",
  "I understand that the membership fee must be paid in advance at the beginning of the membership period.",
] as const;

/**
 * The fixed options on the public join form for "What are you currently
 * preparing for?". "Other" is special-cased so the applicant can name their own
 * preparation, which is stored separately.
 */
export const PREPARATION_OPTIONS = [
  "UPSC (Civil Services)",
  "State PSC",
  "SSC / Group C",
  "Banking (IBPS / SBI)",
  "Railways / Defence",
  "NEET / Medical",
  "JEE / Engineering",
  "GATE / Post-graduate",
  "School / College studies",
  "Other",
] as const;

/** How many applications one IP may submit in a day, and the window (in days)
 *  that a mobile or Aadhaar number stays tied to an open application. */
export const APPLICATION_RATE_LIMIT = { perIpPerDay: 5, duplicateWindowDays: 30 } as const;

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
  { href: "/applications", label: "Applications" },
  { href: "/payments", label: "Payments" },
  { href: "/reminders", label: "Reminders" },
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

/**
 * Forward padding for the month *filters* on the dashboard and payments pages,
 * as opposed to the pickers that record a payment.
 *
 * The two want different things. A filter is for looking at months that have
 * records, so it adds only a few months ahead of the data, while recording is
 * the opposite: a fee for next month has to be enterable before that month
 * arrives, so the forms keep the full `MONTH_PAD_FORWARD`.
 *
 * Neither is what stops the filters running out of years, though. That is
 * `MONTH_PICKER_THROUGH` below, which every picker honours. Recording a payment
 * beyond that still extends the range, because the window is derived from the
 * data rather than stored.
 */
export const MONTH_FILTER_PAD_FORWARD = 3;

/**
 * The last month the month pickers offer, whatever the data says.
 *
 * Fees are collected in advance, so looking at a month that has no records yet is
 * ordinary rather than a mistake. Without a floor like this the year strip only
 * ever reached a year or so past the last payment, which is not far enough to
 * check a coming year's fees. The stepper makes a long range cheap to move
 * through: the years are buttons, so a longer range costs nothing to browse.
 *
 * This is a floor, not a ceiling. A payment recorded past it extends the range,
 * so the pickers keep working once 2030 is behind us.
 */
export const MONTH_PICKER_THROUGH = "2030-12";

/** Upper bound on the size of a month list, so bad data cannot build a huge one. */
export const MAX_MONTH_WINDOW = 360;

/** Ways the member list can be ordered. The first entry is the default. */
export const MEMBER_SORTS = [
  { value: "oldest", label: "Join date, oldest first" },
  { value: "newest", label: "Join date, newest first" },
  { value: "status-name", label: "Active first, then name A-Z" },
  { value: "name-asc", label: "Name (A-Z)" },
  { value: "name-desc", label: "Name (Z-A)" },
  { value: "seat", label: "Seat number" },
  { value: "member-id", label: "Member ID" },
  { value: "recently-updated", label: "Recently updated" },
] as const;

export type MemberSort = (typeof MEMBER_SORTS)[number]["value"];

export const DEFAULT_MEMBER_SORT: MemberSort = "oldest";

export function isMemberSort(value: string | undefined): value is MemberSort {
  return MEMBER_SORTS.some((option) => option.value === value);
}

export const PAGE_SIZE = 12;

/**
 * Classes for a table header cell that stays put while a long list is scrolled.
 *
 * Two details matter here. The background has to be opaque (`bg-muted`, not
 * `bg-muted/50`) or the rows show through it as they pass underneath. And the
 * offset is `top-14` on small screens because the app has a 56px top bar there,
 * which would otherwise sit on top of the header; from `lg` up there is no top
 * bar, so the header can park at `top-0`.
 *
 * For this to work at all, no ancestor may set `overflow-hidden` or
 * `overflow-auto`: either one makes that box a scroll container and the header
 * sticks to it instead of to the viewport, so it appears not to work at all.
 */
export const STICKY_HEADER_CELL =
  "sticky top-14 z-10 rounded-t-xl border-b border-border bg-muted px-3 py-2.5 text-left font-medium first:rounded-tl-xl last:rounded-tr-xl lg:top-0";
