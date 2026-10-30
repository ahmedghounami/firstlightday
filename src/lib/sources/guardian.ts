import { fetchJson, qs } from "../http";
import type { Adapter, ArchiveRecord, Category, ParsedDate } from "../types";
import { makeRecord } from "./record";

export interface GuardianItem {
  id: string;
  webTitle: string;
  webUrl: string;
  webPublicationDate: string;
  sectionName?: string;
}

const SECTIONS: [RegExp, Category][] = [
  [/sport|football/i, "sports"],
  [/music/i, "music"],
  [/film/i, "film"],
  [/television/i, "tv"],
  [/science/i, "science"],
  [/technology/i, "technology"],
  [/business|money/i, "business"],
  [/books|art|culture|stage/i, "culture"],
];

/** Dated by publication: a report published this day may describe something from the day before. */
export function itemsToRecords(items: GuardianItem[], date: ParsedDate): ArchiveRecord[] {
  return items
    .filter((i) => i.webPublicationDate.slice(0, 10) === date.iso)
    .map((i) =>
      makeRecord({
        id: `guardian-${i.id.split("/").pop()}`,
        title: i.webTitle,
        date,
        meaning: "published",
        category: SECTIONS.find(([re]) => re.test(i.sectionName ?? ""))?.[1] ?? "world",
        hidden: true,
        sitelinks: 1,
        meta: { publisher: "The Guardian" },
        evidence: [{ provider: "guardian", label: "The Guardian", url: i.webUrl, claimedDate: date.iso, hasReference: true }],
      }),
    );
}

export const guardian: Adapter = {
  id: "guardian",
  label: "The Guardian Open Platform",
  unavailable: (d) => {
    if (!process.env.GUARDIAN_API_KEY) return { state: "unconfigured", note: "Set GUARDIAN_API_KEY to add reported headlines." };
    return d.year < 1999 ? { state: "out-of-range", note: "Online Guardian archive begins in 1999." } : null;
  },
  async fetch(date) {
    const res = await fetchJson<{ response: { results: GuardianItem[] } }>(
      `https://content.guardianapis.com/search?${qs({
        "from-date": date.iso,
        "to-date": date.iso,
        "page-size": 30,
        "order-by": "relevance",
        "api-key": process.env.GUARDIAN_API_KEY,
      })}`,
    );
    return itemsToRecords(res.response.results, date);
  },
};
