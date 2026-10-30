import type { ParsedDate } from "./types";

const SYNODIC_MONTH = 29.530588853;
/** New moon of 6 January 2000, 18:14 UTC, the usual reference epoch. */
const REFERENCE_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14);

export interface MoonPhase {
  /** 0 new, 0.5 full, 1 new. */
  fraction: number;
  /** Share of the disc lit, 0 to 1. */
  illumination: number;
  name: string;
}

/** Mean-lunation estimate at noon UTC; accurate to about half a day, so phases are named broadly. */
export function moonPhase(d: ParsedDate): MoonPhase {
  const days = (Date.UTC(d.year, d.month - 1, d.day, 12) - REFERENCE_NEW_MOON) / 864e5;
  const fraction = ((days % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH / SYNODIC_MONTH;
  const illumination = (1 - Math.cos(2 * Math.PI * fraction)) / 2;
  const names = [
    "New moon", "Waxing crescent", "First quarter", "Waxing gibbous",
    "Full moon", "Waning gibbous", "Last quarter", "Waning crescent",
  ] as const;
  return { fraction, illumination, name: names[Math.round(fraction * 8) % 8]! };
}
