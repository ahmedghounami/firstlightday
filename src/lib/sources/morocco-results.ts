import { monthName } from "../date";
import { fetchJson, qs } from "../http";
import type { Adapter, ArchiveRecord, ParsedDate } from "../types";
import { plainText, wikiUrl } from "../wikitext";
import { teamFrom } from "./countries";
import { makeRecord } from "./record";

const pageFor = (year: number) =>
  year >= 2020 ? "Morocco national football team results (2020–present)" : year >= 1990 ? "Morocco national football team results (1990–2019)" : "Morocco national football team results (1957–1989)";

function field(box: string, name: string): string {
  return new RegExp(`^\\s*\\|\\s*${name}\\s*=([\\s\\S]*?)(?=^\\s*\\||\\Z)`, "m").exec(box)?.[1]?.trim() ?? "";
}

const scorers = (cell: string) => cell.split("\n").map((l) => /\[\[(?:[^\]|]*\|)?([^\]]+)\]\]/.exec(l)?.[1]).filter((x): x is string => !!x);
const scorerArticle = (cell: string) => /\[\[([^\]|]+)/.exec(cell)?.[1];

/** One match box per game, keeping only the box dated exactly this day. */
export function parseMatch(wikitext: string, date: ParsedDate, page: string): ArchiveRecord | null {
  const stamp = new RegExp(`\\|\\s*date\\s*=\\s*(?:\\{\\{[^|]*\\|)?\\s*${date.day} ${monthName(date)} ${date.year}\\b`);
  for (const box of wikitext.split(/\{\{\s*(?:#invoke:)?Football box/i).slice(1)) {
    if (!stamp.test(box.slice(0, 300))) continue;
    const home = teamFrom(field(box, "team1"));
    const away = teamFrom(field(box, "team2"));
    const score = /\d+\s*[–-]\s*\d+/.exec(field(box, "score"))?.[0]?.replace(/\s/g, "").replace("-", "–");
    if (!home.name || !away.name || !score) return null;
    const round = plainText(field(box, "round").replace(/\{\{[^}]*\}\}/g, "")) ?? undefined;
    const stadium = plainText(field(box, "stadium").replace(/\{\{[^}]*\}\}/g, ""))?.split(",")[0];
    const homeIsMorocco = home.code === "MAR" || home.name === "Morocco";
    const goalCell = field(box, homeIsMorocco ? "goals1" : "goals2");
    const list = scorers(goalCell);
    return makeRecord({
      id: `morocco-match-${date.iso}`,
      title: `${home.name} ${score} ${away.name}`,
      summary: [round, stadium].filter(Boolean).join(", "),
      date,
      meaning: "occurred",
      category: "sports",
      sitelinks: 30,
      meta: {
        morocco: true,
        matchTitle: `${home.name} ${score} ${away.name}`,
        arTitle: `${home.ar ?? home.name} ${score} ${away.ar ?? away.name}`,
        opponent: homeIsMorocco ? away.name : home.name,
        score,
        competition: round,
        venue: stadium,
        scorers: list.length ? list : undefined,
        imageTitle: scorerArticle(goalCell),
      },
      evidence: [{ provider: "wikipedia-morocco", label: `Wikipedia: ${page}`, url: wikiUrl(page), claimedDate: date.iso, license: "CC BY-SA 4.0", hasReference: true }],
    });
  }
  return null;
}

export const moroccoResults: Adapter = {
  id: "wikipedia-morocco",
  label: "Morocco national team results",
  unavailable: (d) => (d.year < 1957 ? { state: "out-of-range", note: "Records begin in 1957." } : null),
  async fetch(date) {
    const page = pageFor(date.year);
    const res = await fetchJson<{ parse?: { wikitext: string } }>(
      `https://en.wikipedia.org/w/api.php?${qs({ action: "parse", page, prop: "wikitext", format: "json", formatversion: 2 })}`,
      { lane: "wikimedia", timeoutMs: 20_000 },
    );
    const record = res.parse ? parseMatch(res.parse.wikitext, date, page) : null;
    return record ? [record] : [];
  },
};
