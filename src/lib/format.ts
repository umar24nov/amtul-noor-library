import { MONTH_NAMES, SEAT_PAD } from "@/lib/constants";

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

/** Month options for selects, e.g. `2026-10` -> "October 2026". */
export function monthOptions(back = 18, forward = 1): { value: string; label: string }[] {
  const now = new Date();
  const options: { value: string; label: string }[] = [];
  for (let i = -forward; i <= back; i += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    options.push({ value: key, label: `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}` });
  }
  return options.reverse();
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