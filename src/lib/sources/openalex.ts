import { fetchJson, qs } from "../http";
import type { Adapter, ArchiveRecord, ParsedDate } from "../types";
import { makeRecord } from "./record";

export interface Work {
  id: string;
  title?: string | null;
  doi?: string | null;
  publication_date: string;
  cited_by_count: number;
  type?: string;
  primary_location?: { source?: { display_name?: string } | null } | null;
}

/** Publishers use the 1st as a stand-in for "this month", and indexes use 31 December for "this year". */
export const isPlaceholderDay = (d: ParsedDate) => d.day === 1 || (d.month === 12 && d.day === 31);

export function worksToRecords(works: Work[], date: ParsedDate): ArchiveRecord[] {
  if (isPlaceholderDay(date)) return [];
  return works
    .filter((w) => w.publication_date === date.iso && w.title && w.cited_by_count >= 5)
    .map((w) =>
      makeRecord({
        id: `openalex-${w.id.split("/").pop()}`,
        title: w.title!.replace(/<[^>]+>/g, ""),
        date,
        meaning: "published",
        category: "science",
        hidden: true,
        sitelinks: 1,
        meta: { citations: w.cited_by_count, journal: w.primary_location?.source?.display_name },
        evidence: [{ provider: "openalex", label: "OpenAlex", url: w.doi ?? w.id, claimedDate: date.iso, license: "CC0" }],
      }),
    );
}

export const openalex: Adapter = {
  id: "openalex",
  label: "OpenAlex research index",
  unavailable: (d) => (isPlaceholderDay(d) ? { state: "out-of-range", note: "Skipped: publication dates on this day are often placeholders." } : null),
  async fetch(date) {
    const res = await fetchJson<{ results: Work[] }>(
      `https://api.openalex.org/works?${qs({
        filter: `publication_date:${date.iso},type:article`,
        sort: "cited_by_count:desc",
        "per-page": 6,
        select: "id,title,doi,publication_date,cited_by_count,type,primary_location",
        api_key: process.env.OPENALEX_API_KEY,
      })}`,
      { retries: 1 },
    );
    return worksToRecords(res.results, date);
  },
};
