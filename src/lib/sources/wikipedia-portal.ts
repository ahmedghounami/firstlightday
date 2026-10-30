import { monthName } from "../date";
import { fetchJson, qs } from "../http";
import type { Adapter, ArchiveRecord, Category, ParsedDate } from "../types";
import { firstLink, headline, plainText, stripRefs, wikiUrl } from "../wikitext";
import { makeRecord, slug } from "./record";

const HEADINGS: [RegExp, Category][] = [
  [/sport/i, "sports"],
  [/art|culture|entertainment/i, "culture"],
  [/business|econom/i, "business"],
  [/science|technology|health|environment/i, "science"],
];

function categoryFor(heading: string | undefined): Category {
  if (heading) for (const [re, category] of HEADINGS) if (re.test(heading)) return category;
  return "world";
}

/** Items from a Current Events day page: deepest bullets are the reports, parents are their topic. */
export function parsePortal(wikitext: string, date: ParsedDate, pageTitle: string): ArchiveRecord[] {
  const records: ArchiveRecord[] = [];
  let heading: string | undefined;
  const lines = wikitext.split("\n");

  lines.forEach((line, i) => {
    const h = /^(?:'''|;)\s*([^']+?)\s*(?:''')?$/.exec(line.trim());
    if (h) {
      heading = h[1];
      return;
    }
    const bullet = /^(\*+)\s*(.+)$/.exec(line);
    if (!bullet) return;
    const depth = bullet[1]!.length;
    const next = /^(\*+)/.exec(lines[i + 1] ?? "");
    if (next && next[1]!.length > depth) return; // A topic header, not a report.

    const { text: noRefs, citedUrl, hasReference } = stripRefs(bullet[2]!);
    const text = plainText(noRefs);
    if (!text || text.length < 25) return;
    const title = headline(text);
    records.push(
      makeRecord({
        id: `portal-${slug(title)}`,
        title,
        summary: text,
        date,
        meaning: "occurred",
        category: categoryFor(heading),
        wikiTitle: firstLink(noRefs),
        evidence: [
          {
            provider: "wikipedia-portal",
            label: "Wikipedia: Current Events portal",
            url: wikiUrl(pageTitle),
            claimedDate: date.iso,
            license: "CC BY-SA 4.0",
            citedUrl,
            hasReference,
          },
        ],
      }),
    );
  });
  return records;
}

interface ParseResponse {
  parse?: { wikitext: string };
  error?: { code: string };
}

export const wikipediaPortal: Adapter = {
  id: "wikipedia-portal",
  label: "Wikipedia Current Events portal",
  unavailable: (d) =>
    d.year < 1994 ? { state: "out-of-range", note: "Daily Current Events pages begin in the 1990s and are patchy before 2002." } : null,
  async fetch(date) {
    const pageTitle = `Portal:Current events/${date.year} ${monthName(date)} ${date.day}`;
    const res = await fetchJson<ParseResponse>(
      `https://en.wikipedia.org/w/api.php?${qs({ action: "parse", page: pageTitle, prop: "wikitext", format: "json", formatversion: 2 })}`,
      { lane: "wikimedia" },
    );
    if (res.error || !res.parse) return []; // missingtitle: no page for this day.
    return parsePortal(res.parse.wikitext, date, pageTitle);
  },
};
