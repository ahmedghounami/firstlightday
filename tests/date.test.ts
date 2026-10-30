import { describe, expect, it } from "vitest";
import { dateErrorMessage, dayOfYear, daysInMonth, isLeapYear, parseIso, validateDate, weekday } from "@/lib/date";
import { moonPhase } from "@/lib/moon";

const TODAY = "2026-10-30";
const v = (y: number, m: number, d: number) => validateDate(y, m, d, TODAY);

describe("date validation", () => {
  it("accepts real dates", () => expect(v(2002, 8, 17).ok).toBe(true));
  it("rejects a future date but allows today", () => {
    expect(v(2026, 10, 31)).toEqual({ ok: false, error: "future" });
    expect(v(2026, 10, 30).ok).toBe(true);
  });
  it("rejects dates before coverage", () => expect(v(1899, 12, 31)).toEqual({ ok: false, error: "too-old" }));
  it("rejects impossible days and months", () => {
    expect(v(2002, 13, 1)).toEqual({ ok: false, error: "month" });
    expect(v(2002, 4, 31)).toEqual({ ok: false, error: "day" });
    expect(v(2002, 8, 0)).toEqual({ ok: false, error: "day" });
  });
  it("rejects non-integers", () => expect(v(2002.5, 8, 1)).toEqual({ ok: false, error: "format" }));
  it("parses only strict ISO", () => {
    expect(parseIso("2002-08-17", TODAY).ok).toBe(true);
    expect(parseIso("2002-8-17", TODAY).ok).toBe(false);
    expect(parseIso("17/08/2002", TODAY).ok).toBe(false);
    expect(parseIso("2002-08-17-extra", TODAY).ok).toBe(false);
  });
});

describe("leap years", () => {
  it("follows the century rule", () => {
    expect(isLeapYear(2000)).toBe(true);
    expect(isLeapYear(1900)).toBe(false);
    expect(isLeapYear(2004)).toBe(true);
    expect(isLeapYear(2002)).toBe(false);
  });
  it("accepts 29 Feb only in leap years", () => {
    expect(v(2000, 2, 29).ok).toBe(true);
    expect(v(1900, 2, 29)).toEqual({ ok: false, error: "day" });
    expect(v(2001, 2, 29)).toEqual({ ok: false, error: "day" });
  });
  it("explains the failure in plain words", () => {
    expect(dateErrorMessage("day", 2001, 2, 29)).toContain("wasn't a leap year");
    expect(daysInMonth(2000, 2)).toBe(29);
  });
});

describe("derived facts", () => {
  it("computes weekdays", () => {
    expect(weekday({ iso: "", year: 2002, month: 8, day: 17 })).toBe("Saturday");
    expect(weekday({ iso: "", year: 1985, month: 7, day: 13 })).toBe("Saturday");
    expect(weekday({ iso: "", year: 2000, month: 2, day: 29 })).toBe("Tuesday");
  });
  it("counts day of year across leap Februaries", () => {
    expect(dayOfYear({ year: 2000, month: 12, day: 31 })).toBe(366);
    expect(dayOfYear({ year: 2001, month: 12, day: 31 })).toBe(365);
  });
  it("matches known moon phases", () => {
    // Full moon 22 Aug 2002 and new moon 11 Aug 1999 (the solar eclipse).
    expect(moonPhase({ iso: "", year: 2002, month: 8, day: 22 }).illumination).toBeGreaterThan(0.97);
    expect(moonPhase({ iso: "", year: 1999, month: 8, day: 11 }).illumination).toBeLessThan(0.03);
  });
});
