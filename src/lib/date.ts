import type { ParsedDate } from "./types";

export const MIN_YEAR = 1900;

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number): number {
  return [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] ?? 0;
}

export function toIso(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function todayIso(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export type DateError = "format" | "month" | "day" | "future" | "too-old";

export type DateResult = { ok: true; date: ParsedDate } | { ok: false; error: DateError };

export function validateDate(year: number, month: number, day: number, today = todayIso()): DateResult {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return { ok: false, error: "format" };
  if (month < 1 || month > 12) return { ok: false, error: "month" };
  if (year < MIN_YEAR) return { ok: false, error: "too-old" };
  if (day < 1 || day > daysInMonth(year, month)) return { ok: false, error: "day" };
  const iso = toIso(year, month, day);
  if (iso > today) return { ok: false, error: "future" };
  return { ok: true, date: { iso, year, month, day } };
}

export function parseIso(value: string, today = todayIso()): DateResult {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return { ok: false, error: "format" };
  return validateDate(Number(m[1]), Number(m[2]), Number(m[3]), today);
}

export function dateErrorMessage(error: DateError, year?: number, month?: number, day?: number): string {
  switch (error) {
    case "future":
      return "That day hasn't happened yet. Choose a date up to today.";
    case "too-old":
      return `Our archive starts in ${MIN_YEAR}. Choose a later year.`;
    case "month":
      return "Choose a month from the list.";
    case "day":
      if (month === 2 && day === 29 && year !== undefined) return `${year} wasn't a leap year, so it had no 29 February.`;
      if (month !== undefined && year !== undefined) {
        return `${MONTHS[month - 1]} ${year} had ${daysInMonth(year, month)} days.`;
      }
      return "That day doesn't exist in that month.";
    default:
      return "Enter a day, a month and a four-digit year.";
  }
}

export function weekday(d: ParsedDate): string {
  return WEEKDAYS[new Date(Date.UTC(d.year, d.month - 1, d.day)).getUTCDay()]!;
}

export function monthName(d: ParsedDate): string {
  return MONTHS[d.month - 1]!;
}

export function formatDate(d: ParsedDate): string {
  return `${d.day} ${monthName(d)} ${d.year}`;
}

export function dayOfYear(d: Pick<ParsedDate, "year" | "month" | "day">): number {
  return Math.round((Date.UTC(d.year, d.month - 1, d.day) - Date.UTC(d.year, 0, 1)) / 864e5) + 1;
}

export function daysSince(d: ParsedDate, today = todayIso()): number {
  const [y, m, dd] = today.split("-").map(Number) as [number, number, number];
  return Math.round((Date.UTC(y, m - 1, dd) - Date.UTC(d.year, d.month - 1, d.day)) / 864e5);
}

export function shiftDays(d: ParsedDate, delta: number): string {
  return new Date(Date.UTC(d.year, d.month - 1, d.day + delta)).toISOString().slice(0, 10);
}

/** Every plausible way an English source writes this day, for matching text lines. */
export function dayLabels(d: ParsedDate): { mdy: string; dmy: string } {
  const name = monthName(d);
  return { mdy: `${name} ${d.day}`, dmy: `${d.day} ${name}` };
}
