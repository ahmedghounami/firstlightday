import { fetchJson } from "../http";
import { regionOf } from "../regions";
import type { Adapter, ArchiveRecord, ParsedDate } from "../types";
import { makeRecord } from "./record";

const SPORTS = ["Soccer", "Basketball", "Motorsport"];

export interface SportsEvent {
  idEvent: string;
  strEvent: string;
  strLeague?: string | null;
  strSport?: string | null;
  dateEvent?: string | null;
  intHomeScore?: string | null;
  intAwayScore?: string | null;
  strVenue?: string | null;
  strCountry?: string | null;
}

/** Fixtures can exist with no result; a score is shown only when both sides have one. */
export function eventsToRecords(events: SportsEvent[], date: ParsedDate): ArchiveRecord[] {
  return events
    .filter((e) => e.dateEvent === date.iso)
    .map((e) => {
      const hasScore = e.intHomeScore != null && e.intAwayScore != null && e.intHomeScore !== "" && e.intAwayScore !== "";
      return makeRecord({
        id: `tsdb-${e.idEvent}`,
        title: e.strEvent,
        date,
        meaning: "occurred",
        category: "sports",
        region: regionOf(e.strCountry ?? undefined),
        place: e.strCountry ?? undefined,
        hidden: true,
        sitelinks: 2,
        meta: { competition: e.strLeague ?? e.strSport ?? undefined, score: hasScore ? `${e.intHomeScore}–${e.intAwayScore}` : undefined, venue: e.strVenue ?? undefined },
        evidence: [{ provider: "thesportsdb", label: "TheSportsDB", url: `https://www.thesportsdb.com/event/${e.idEvent}`, claimedDate: date.iso }],
      });
    });
}

export const thesportsdb: Adapter = {
  id: "thesportsdb",
  label: "TheSportsDB (free tier)",
  async fetch(date) {
    const key = process.env.THESPORTSDB_API_KEY || "123";
    const out: ArchiveRecord[] = [];
    for (const sport of SPORTS) {
      const res = await fetchJson<{ events: SportsEvent[] | null }>(
        `https://www.thesportsdb.com/api/v1/json/${key}/eventsday.php?d=${date.iso}&s=${encodeURIComponent(sport)}`,
        { lane: "tsdb", gapMs: 1000, retries: 0 },
      );
      out.push(...eventsToRecords(res.events ?? [], date));
    }
    return out;
  },
};
