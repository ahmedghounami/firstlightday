import { fetchJson } from "../http";
import { sameStory } from "../pipeline";
import type { Adapter, ArchiveRecord, Category, DateMeaning, OtherYearEvent, ParsedDate } from "../types";
import { headline, wikiUrl } from "../wikitext";
import { makeRecord, slug } from "./record";

interface FeedPage {
  titles: { normalized: string };
  content_urls?: { desktop?: { page?: string } };
}
interface FeedEntry {
  text: string;
  year: number;
  pages?: FeedPage[];
}
export interface Feed {
  selected?: FeedEntry[];
  events?: FeedEntry[];
  births?: FeedEntry[];
  deaths?: FeedEntry[];
}

const pad = (n: number) => String(n).padStart(2, "0");

export const fetchFeed = (date: ParsedDate) =>
  fetchJson<Feed>(`https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/all/${pad(date.month)}/${pad(date.day)}`, {
    lane: "wikimedia-feed",
    timeoutMs: 20_000,
  });

function toRecord(entry: FeedEntry, date: ParsedDate, category: Category, meaning: DateMeaning): ArchiveRecord {
  const page = entry.pages?.[0];
  const wikiTitle = page?.titles.normalized;
  const url = page?.content_urls?.desktop?.page ?? wikiUrl(`${date.month}_${date.day}`);
  const birthOrDeath = meaning === "born" || meaning === "died";
  const title = birthOrDeath ? (wikiTitle ?? entry.text.split(",")[0]!) : headline(entry.text);
  return makeRecord({
    id: `otd-${meaning}-${slug(title)}`,
    title,
    summary: entry.text,
    date,
    meaning,
    category,
    wikiTitle,
    evidence: [
      { provider: "wikipedia-onthisday", label: "Wikipedia: On This Day", url, claimedDate: date.iso, license: "CC BY-SA 4.0" },
    ],
  });
}

/** Only entries whose year equals the requested year may become exact-date records. */
export function exactRecords(feed: Feed, date: ParsedDate): ArchiveRecord[] {
  const exact = (list?: FeedEntry[]) => (list ?? []).filter((e) => e.year === date.year);
  const seen = new Set<string>();
  const events = [...exact(feed.selected), ...exact(feed.events)].filter((e) => {
    if (seen.has(e.text)) return false;
    seen.add(e.text);
    return true;
  });
  return [
    ...events.map((e) => toRecord(e, date, "world", "occurred")),
    ...exact(feed.births).map((e) => toRecord(e, date, "born", "born")),
    ...exact(feed.deaths).map((e) => toRecord(e, date, "died", "died")),
  ];
}

/** The rest of the feed, for the clearly separated "same day, other years" section. */
export function otherYears(feed: Feed, date: ParsedDate): OtherYearEvent[] {
  // "selected" and "events" often carry one event in different words, so exact text is not enough.
  const kept: FeedEntry[] = [];
  for (const e of [...(feed.selected ?? []), ...(feed.events ?? [])]) {
    if (e.year === date.year || e.year <= 0) continue;
    const repeat = kept.some((k) => k.year === e.year && (slug(k.text) === slug(e.text) || sameStory(k.text, e.text)));
    if (!repeat) kept.push(e);
  }
  return kept
    .map((e) => {
      const page = e.pages?.[0];
      return {
        id: `${e.year}-${slug(e.text)}`,
        year: e.year,
        text: e.text,
        url: page?.content_urls?.desktop?.page ?? wikiUrl(String(e.year)),
        wikiTitle: page?.titles.normalized,
      };
    })
    .sort((a, b) => b.year - a.year);
}

export const wikipediaOnThisDay: Adapter = {
  id: "wikipedia-onthisday",
  label: "Wikipedia On This Day feed",
  fetch: async (date) => exactRecords(await fetchFeed(date), date),
};
