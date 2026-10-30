import { classifyText } from "../classify";
import { dayLabels } from "../date";
import { fetchJson, qs } from "../http";
import { regionOf } from "../regions";
import type { Adapter, ArchiveRecord, Category, ParsedDate } from "../types";
import { firstLink, headline, plainText, stripRefs, wikiUrl } from "../wikitext";
import { makeRecord, slug } from "./record";

const API = "https://en.wikipedia.org/w/api.php";

interface AnnualPage {
  title: (y: number) => string;
  category?: Category;
  country?: string;
  /** The main year article is the one Wikipedia editors treat as globally notable. */
  primary?: boolean;
}

const TOPICS: AnnualPage[] = [
  { title: (y) => `${y}`, primary: true },
  { title: (y) => `${y} in music`, category: "music" },
  { title: (y) => `${y} in science`, category: "science" },
  { title: (y) => `${y} in spaceflight`, category: "science" },
  { title: (y) => `${y} in aviation`, category: "technology" },
  { title: (y) => `${y} in rail transport`, category: "technology" },
  { title: (y) => `${y} in video games`, category: "technology" },
  { title: (y) => `${y} in literature`, category: "culture" },
  { title: (y) => `${y} in art`, category: "culture" },
  { title: (y) => `${y} in architecture`, category: "culture" },
  { title: (y) => `${y} in sports`, category: "sports" },
  { title: (y) => `${y} in association football`, category: "sports" },
  { title: (y) => `${y} in film`, category: "film" },
  { title: (y) => `${y} in British television`, category: "tv" },
  { title: (y) => `${y} in American television`, category: "tv" },
];

const COUNTRIES = [
  "the United States", "the United Kingdom", "Canada", "Ireland", "France", "Germany", "Italy", "Spain",
  "Russia", "Ukraine", "Turkey", "Egypt", "Nigeria", "South Africa", "Kenya", "Morocco", "India", "Pakistan",
  "China", "Japan", "South Korea", "the Philippines", "Australia", "New Zealand", "Brazil", "Argentina", "Mexico",
];

const pagesFor = (): AnnualPage[] => [
  ...TOPICS,
  ...COUNTRIES.map((c) => ({ title: (y: number) => `${y} in ${c}`, country: c.replace(/^the /, "") })),
];

export interface DatedLine {
  raw: string;
  context?: string;
}

const EXCLUDED_SECTION = /\b(births?|deaths?|died|nobel|awards?|prizes?|see also|references|notes|external links|further reading|calendar|incumbents|films?|releases?|albums?|debuts|ending|programmes|television shows|charts?|number[- ]ones?|publications?|works)\b/i;

const DASH = String.raw`\s*(?:–|—|-|−|:|&ndash;|&mdash;|\{\{\s*(?:snd|spaced ndash|spaced en dash|ndash|mdash)\s*\}\})\s*`;

/** Lines under an event heading that begin with exactly this day. Ranges and other days never match. */
export function extractDatedLines(wikitext: string, date: ParsedDate): DatedLine[] {
  const { mdy, dmy } = dayLabels(date);
  const label = `(?:\\[\\[)?(?:${mdy}|${dmy})(?:\\]\\])?`;
  const withText = new RegExp(`^\\*+\\s*${label}${DASH}(.+)$`);
  const bare = new RegExp(`^\\*+\\s*${label}\\s*:?\\s*$`);

  const out: DatedLine[] = [];
  const levels: string[] = [];
  const lines = wikitext.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trimEnd();
    const heading = /^(={2,6})\s*(.+?)\s*\1$/.exec(line);
    if (heading) {
      levels.length = heading[1]!.length - 2;
      levels[heading[1]!.length - 2] = heading[2]!;
      continue;
    }
    if (levels.some((h) => h && EXCLUDED_SECTION.test(h))) continue;

    const direct = withText.exec(line);
    if (direct) {
      const rest = direct[1]!;
      // "August 17–18 – the summit": the day began a range, so the record is not about this day alone.
      if (/^(?:\[\[)?\d{1,2}(?:\]\])?\s*(?:–|—|-|,|\band\b)/.test(rest)) continue;
      out.push({ raw: rest });
      continue;
    }
    if (bare.test(line)) {
      const depth = /^\*+/.exec(line)![0].length;
      for (let j = i + 1; j < lines.length; j++) {
        const sub = /^(\*+)\s*(.+)$/.exec(lines[j]!);
        if (!sub || sub[1]!.length <= depth) break;
        out.push({ raw: sub[2]! });
      }
    }
  }
  return out;
}

const MOROCCO_TEXT = /\b(morocc\w*|casablanca|rabat|marrakesh|marrakech|fez|fes|tangier|agadir|meknes|oujda|laayoune|western sahara|hassan ii|mohammed vi|mohammed v)\b/i;

export function lineToRecord(line: DatedLine, page: AnnualPage, pageTitle: string, date: ParsedDate): ArchiveRecord | null {
  const { text: noRefs, citedUrl, hasReference } = stripRefs(line.raw);
  const text = plainText(noRefs);
  if (!text || text.length < 25) return null;
  const wikiTitle = firstLink(noRefs);
  const category = page.category ?? classifyText(text);
  const title = headline(text);

  return makeRecord({
    meta: { morocco: page.country === "Morocco" || MOROCCO_TEXT.test(text) || undefined },
    id: `wp-${slug(pageTitle)}-${slug(title)}`,
    title,
    summary: text,
    date,
    meaning: "occurred",
    category,
    region: regionOf(page.country),
    place: page.country,
    wikiTitle,
    hidden: !page.primary,
    evidence: [
      {
        provider: "wikipedia-annual",
        label: `Wikipedia: ${pageTitle}`,
        url: wikiUrl(pageTitle),
        claimedDate: date.iso,
        license: "CC BY-SA 4.0",
        citedUrl,
        hasReference,
      },
    ],
  });
}

interface RevisionsResponse {
  query?: { pages: { title: string; missing?: boolean; revisions?: { slots: { main: { content: string } } }[] }[] };
}

export const wikipediaAnnual: Adapter = {
  id: "wikipedia-annual",
  label: "Wikipedia year and country pages",
  async fetch(date) {
    const pages = pagesFor();
    const records: ArchiveRecord[] = [];
    for (let i = 0; i < pages.length; i += 20) {
      const batch = pages.slice(i, i + 20);
      const url = `${API}?${qs({
        action: "query", prop: "revisions", rvprop: "content", rvslots: "main", redirects: 1, format: "json", formatversion: 2,
        titles: batch.map((p) => p.title(date.year)).join("|"),
      })}`;
      const res = await fetchJson<RevisionsResponse>(url, { lane: "wikimedia", timeoutMs: 20_000 });
      const byTitle = new Map((res.query?.pages ?? []).map((p) => [p.title, p]));
      for (const page of batch) {
        const title = page.title(date.year);
        const content = byTitle.get(title)?.revisions?.[0]?.slots.main.content;
        if (!content) continue;
        for (const line of extractDatedLines(content, date)) {
          const record = lineToRecord(line, page, title, date);
          if (record) records.push(record);
        }
      }
    }
    return records;
  },
};
