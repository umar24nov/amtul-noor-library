/**
 * The free-text date field on the "money kept" screen accepts a few familiar
 * shapes. Every shape is checked as a real calendar date: a typo must be
 * reported, never quietly turned into today's date or rolled into the next
 * month by JavaScript's Date constructor.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_YEAR = /^(\d{1,2})[\/\-](\d{4})$/;
const DAY_MONTH_YEAR_NUMERIC = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/;
const YEAR_MONTH = /^(\d{4})[\/\-](\d{1,2})$/;
const DAY_MONTH_NAME_YEAR = /^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})$/;

const MONTH_NUMBERS: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

/** UTC midnight for a checked calendar day, or null if the date is impossible. */
function calendarDate(year: number, month: number, day: number): Date | null {
  if (
    !Number.isInteger(year) || year < 1000 || year > 9999 ||
    !Number.isInteger(month) || month < 1 || month > 12 ||
    !Number.isInteger(day) || day < 1 || day > 31
  ) {
    return null;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

/** Parses the accepted free-text dates, or returns null for anything invalid. */
export function parseFlexibleDate(input: string): Date | null {
  const value = input.trim();
  if (!value) return null;

  const iso = ISO_DATE.exec(value);
  if (iso) return calendarDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const monthYear = MONTH_YEAR.exec(value);
  if (monthYear) return calendarDate(Number(monthYear[2]), Number(monthYear[1]), 1);

  const numeric = DAY_MONTH_YEAR_NUMERIC.exec(value);
  if (numeric) return calendarDate(Number(numeric[3]), Number(numeric[2]), Number(numeric[1]));

  const yearMonth = YEAR_MONTH.exec(value);
  if (yearMonth) return calendarDate(Number(yearMonth[1]), Number(yearMonth[2]), 1);

  const named = DAY_MONTH_NAME_YEAR.exec(value);
  if (named) {
    const month = MONTH_NUMBERS[named[2].toLowerCase().slice(0, 3)];
    return month ? calendarDate(Number(named[3]), month, Number(named[1])) : null;
  }

  return null;
}
