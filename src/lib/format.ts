import {
  MAX_MONTH_WINDOW,
  MONTH_NAMES,
  MONTH_PAD_BACK,
  MONTH_PAD_FORWARD,
  MONTH_PICKER_THROUGH,
  SEAT_PAD,
} from "@/lib/constants";

/** Formats a number as Indian Rupees, e.g. 700 -> "₹700", 1250.5 -> "₹1,250.50". */
export function formatINR(
  value: number | string | { toString(): string } | null | undefined,
): string {
  const amount = typeof value === "number" ? value : Number(value ?? 0);
  if (!Number.isFinite(amount)) return "₹0";
  const hasFraction = Math.round(amount * 100) % 100 !== 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Formats a plain number with Indian grouping. */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-IN").format(value);
}

/**
 * All dates are stored as UTC midnight, so they are always formatted in UTC to
 * avoid a date shifting by a day for users in western time zones.
 */
export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** Converts a `YYYY-MM` key into a readable label such as "May 2026". */
export function formatMonth(month: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return month;
  const index = Number(match[2]) - 1;
  return `${MONTH_NAMES[index] ?? match[2]} ${match[1]}`;
}

/** The `YYYY-MM` key for a given date (defaults to now). */
export function toMonthKey(date: Date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** A `YYYY-MM` key for today in the user's local time. */
export function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** Today's date as `YYYY-MM-DD` in the user's local time, for date inputs. */
export function todayInputValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** Parses a `YYYY-MM-DD` input value into a UTC midnight Date. */
export function parseInputDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

/** Formats a Date as `YYYY-MM-DD` for an <input type="date">. */
export function toInputDate(value: Date | null | undefined): string {
  if (!value) return "";
  return value.toISOString().slice(0, 10);
}

/** Month key `YYYY-MM` derived from a `YYYY-MM-DD` string. */
export function monthKeyFromInputDate(value: string): string {
  return value.slice(0, 7);
}

/** Normalises a seat number to the padded form used everywhere, e.g. 3 -> "03". */
export function normalizeSeatNumber(value: string | number): string {
  const digits = String(value).replace(/\D/g, "");
  if (!digits) return "";
  return digits.padStart(SEAT_PAD, "0");
}

/** Builds a list of month keys walking backwards from the given month. */
export function recentMonthKeys(count: number, from: string = currentMonthKey()): string[] {
  const [year, month] = from.split("-").map(Number);
  const keys: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const date = new Date(Date.UTC(year, month - 1 - i, 1));
    keys.push(toMonthKey(date));
  }
  return keys;
}

/** All month keys between two inclusive `YYYY-MM` keys. */
export function monthKeyRange(from: string, to: string): string[] {
  const [fromYear, fromMonth] = from.split("-").map(Number);
  const [toYear, toMonth] = to.split("-").map(Number);
  const keys: string[] = [];
  let year = fromYear;
  let month = fromMonth;
  while (year < toYear || (year === toYear && month <= toMonth)) {
    keys.push(`${year}-${String(month).padStart(2, "0")}`);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return keys;
}

export type MonthOption = { value: string; label: string };

/** Month options for selects, e.g. `2026-10` -> "October 2026". */
export function monthOptions(back = 18, forward = 1): MonthOption[] {
  const now = new Date();
  const options: MonthOption[] = [];
  for (let i = -forward; i <= back; i += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    options.push({ value: key, label: `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}` });
  }
  return options.reverse();
}

/** Moves a `YYYY-MM` key forwards or backwards by whole months. */
export function shiftMonthKey(month: string, delta: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, monthNumber - 1 + delta, 1));
  if (Number.isNaN(shifted.getTime())) return month;
  return toMonthKey(shifted);
}

/** Matches a `YYYY-MM` month key with a real month number. */
const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Orders `YYYY-MM` keys oldest first. Ignores anything that is not a month key. */
function sortMonthKeys(keys: string[]): string[] {
  return keys.filter((key) => MONTH_KEY_PATTERN.test(key)).sort();
}

export type MonthWindow = {
  /** Oldest month in the window. */
  from: string;
  /** Newest month in the window. */
  to: string;
};

/**
 * Widest month window covering the data plus padding on both sides.
 *
 * The padding matters: without months ahead of the last payment the app could
 * never record or view a future month, and months behind the first payment would
 * disappear as soon as old rows were archived.
 *
 * `through` is a floor rather than more padding, so the years on offer do not
 * depend on how far the data happens to reach. It is compared as a string
 * because `YYYY-MM` sorts in calendar order, and an unusable value is ignored
 * instead of being allowed to produce an unselectable window.
 */
export function monthWindow({
  earliest,
  latest,
  now = currentMonthKey(),
  padBack = MONTH_PAD_BACK,
  padForward = MONTH_PAD_FORWARD,
  through = MONTH_PICKER_THROUGH,
}: {
  earliest?: string | null;
  latest?: string | null;
  now?: string;
  padBack?: number;
  padForward?: number;
  through?: string | null;
}): MonthWindow {
  const known = sortMonthKeys([earliest ?? "", latest ?? "", now]);
  const start = shiftMonthKey(known[0] ?? now, -padBack);
  const paddedEnd = shiftMonthKey(known[known.length - 1] ?? now, padForward);
  const floor = through && MONTH_KEY_PATTERN.test(through) ? through : "";
  const end = floor > paddedEnd ? floor : paddedEnd;

  // Never build an unbounded list if bad data ever lands in the database. If the
  // window is wider than the cap, keep the months around the current month
  // instead, so today is always selectable even in that case.
  const range = monthKeyRange(start, end);
  if (range.length <= MAX_MONTH_WINDOW) return { from: start, to: end };

  const cappedStart = shiftMonthKey(now, -Math.floor(MAX_MONTH_WINDOW / 2));
  const capped = monthKeyRange(cappedStart, shiftMonthKey(cappedStart, MAX_MONTH_WINDOW - 1));
  return { from: capped[0], to: capped[capped.length - 1] };
}

/** Months covering the data, newest first, ready for a select. */
export function selectableMonthKeys(window: MonthWindow): string[] {
  return monthKeyRange(window.from, window.to).reverse();
}

/** Turns month keys into `{value,label}` options, newest first. */
export function monthSelectOptions(months: string[]): MonthOption[] {
  return months.map((key) => ({ value: key, label: formatMonth(key) }));
}

/** Mobile numbers are shown as plain 10 digit strings. */
export function formatMobile(value: string | null | undefined): string {
  if (!value) return "—";
  return value.replace(/\D/g, "");
}

export function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}