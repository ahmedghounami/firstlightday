import { fetchJson } from "../http";
import { regionOf } from "../regions";
import type { Adapter, ArchiveRecord, ParsedDate } from "../types";
import { makeRecord } from "./record";

const COUNTRIES: [string, string][] = [["US", "United States"], ["GB", "United Kingdom"], ["CA", "Canada"], ["AU", "Australia"], ["JP", "Japan"]];

export interface ScheduleEntry {
  id: number;
  url: string;
  name: string;
  season: number;
  number: number | null;
  airdate: string;
  summary?: string | null;
  show: {
    name: string;
    type?: string;
    genres?: string[];
    weight?: number;
    premiered?: string | null;
    network?: { name: string } | null;
    url: string;
  };
}

/** The schedule endpoint can include late-night episodes dated the day before, so airdate is rechecked. */
export function scheduleToRecords(entries: ScheduleEntry[], date: ParsedDate, country: string): ArchiveRecord[] {
  return entries
    .filter((e) => e.airdate === date.iso)
    .map((e) => {
      const isPremiere = e.show.premiered === date.iso || (e.season === 1 && e.number === 1);
      return makeRecord({
        id: `tvmaze-${e.id}`,
        title: e.show.name,
        summary: isPremiere ? `Series premiere: “${e.name}”.` : `“${e.name}” (season ${e.season}${e.number ? `, episode ${e.number}` : ""}).`,
        date,
        meaning: isPremiere ? "premiered" : "broadcast",
        category: "tv",
        region: regionOf(country),
        place: country,
        sitelinks: Math.round((e.show.weight ?? 0) / 12),
        hidden: !isPremiere,
        meta: { network: e.show.network?.name, genres: e.show.genres?.slice(0, 2), isPremiere },
        evidence: [{ provider: "tvmaze", label: "TVmaze", url: e.url, claimedDate: date.iso, license: "CC BY-SA 4.0" }],
      });
    });
}

export const tvmaze: Adapter = {
  id: "tvmaze",
  label: "TVmaze",
  async fetch(date) {
    const out: ArchiveRecord[] = [];
    for (const [code, name] of COUNTRIES) {
      const entries = await fetchJson<ScheduleEntry[]>(`https://api.tvmaze.com/schedule?date=${date.iso}&country=${code}`, { lane: "tvmaze" });
      out.push(...scheduleToRecords(entries, date, name));
    }
    return out;
  },
};
