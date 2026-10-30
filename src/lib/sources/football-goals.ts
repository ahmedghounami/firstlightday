import { monthName } from "../date";
import { fetchJson, qs } from "../http";
import type { Adapter, ArchiveRecord, ParsedDate } from "../types";
import { plainText, wikiUrl } from "../wikitext";
import { teamFrom } from "./countries";
import { makeRecord, slug } from "./record";

interface Legend {
  name: string;
  from: number;
  to: number;
  /** The article holding the goals table, when it isn't the standard list page. */
  page?: string;
}

const LEGENDS: Legend[] = [
  { name: "Lionel Messi", from: 2005, to: 2030 },
  { name: "Cristiano Ronaldo", from: 2003, to: 2030 },
  { name: "Neymar", from: 2010, to: 2030 },
  { name: "Kylian Mbappé", from: 2017, to: 2036 },
  { name: "Erling Haaland", from: 2019, to: 2038 },
  { name: "Harry Kane", from: 2015, to: 2032 },
  { name: "Robert Lewandowski", from: 2008, to: 2028 },
  { name: "Luis Suárez", from: 2007, to: 2026 },
  { name: "Sadio Mané", from: 2012, to: 2028 },
  { name: "Mohamed Salah", from: 2011, to: 2030, page: "Mohamed Salah" },
  { name: "Didier Drogba", from: 2002, to: 2014 },
  { name: "Zlatan Ibrahimović", from: 2001, to: 2023 },
  { name: "Wayne Rooney", from: 2003, to: 2018 },
  { name: "Thierry Henry", from: 1997, to: 2010 },
  { name: "Zinedine Zidane", from: 1994, to: 2006, page: "Zinedine Zidane" },
  { name: "Ronaldinho", from: 1999, to: 2013, page: "Ronaldinho" },
  { name: "Kaká", from: 2002, to: 2016, page: "Kaká" },
  { name: "Ronaldo", from: 1994, to: 2011, page: "Ronaldo (Brazilian footballer)" },
  { name: "Diego Maradona", from: 1977, to: 1994 },
  { name: "Pelé", from: 1957, to: 1971 },
];

const listPage = (l: Legend) => l.page ?? `List of international goals scored by ${l.name}`;

export interface GoalRow {
  goals: number;
  opponent: string;
  arOpponent?: string;
  result?: string;
  competition?: string;
  venue?: string;
}

const ATTRIBUTES = /^\s*(?:[\w-]+=(?:"[^"]*"|'[^']*'|[^\s|{]+)\s*)+\|?(?!\|)/;

function cells(row: string): string[] {
  const out: string[] = [];
  for (const line of row.split("\n")) {
    if (!/^[|!]/.test(line) || /^\|[-+}]/.test(line)) {
      if (out.length && line.trim() && !/^[|!]/.test(line)) out[out.length - 1] += ` ${line}`;
      continue;
    }
    // "||" separates inline cells, but not inside templates or links.
    const safe = line.slice(1).replace(/\{\{[^{}]*\}\}|\[\[[^\]]*\]\]/g, (m) => m.replace(/\|/g, "\u0001"));
    for (const c of safe.split(/\|\||!!/)) out.push(c.replace(/\u0001/g, "|").trim());
  }
  return out;
}

const clean = (cell: string) => cell.replace(ATTRIBUTES, "").trim();

function rowDate(cell: string, date: ParsedDate): boolean {
  const name = monthName(date);
  const text = cell.replace(/_/g, " ");
  const dts = /\{\{\s*(?:dts|sort|date)\s*\|\s*(\d{4})\s*\|\s*(\d{1,2})\s*\|\s*(\d{1,2})/i.exec(text);
  if (dts) return Number(dts[1]) === date.year && Number(dts[2]) === date.month && Number(dts[3]) === date.day;
  return new RegExp(`(?:^|[^\\d])${date.day} ${name},? ${date.year}\\b`).test(text) || new RegExp(`\\b${name} ${date.day}, ${date.year}\\b`).test(text);
}

const isOpponent = (cell: string) => /\{\{\s*(?:fb|fbu|flagicon|flag|flagcountry|fb-rt)\s*\|/i.test(cell);
const scoreIn = (cell: string) => /\d+\s*[–-]\s*\d+/.exec(cell)?.[0]?.replace(/\s/g, "").replace("-", "–");
const isOutcome = (cell: string) => /\{\{\s*(?:won|win|drew|draw|lost|loss|nowrap)\b/i.test(cell);

/**
 * Goals on one date. Cells are located relative to the date, not by column number, because rowspans shift columns
 * from row to row. Only the first table with a match counts: pages repeat goals in a separate hat-tricks table.
 */
export function parseGoals(wikitext: string, date: ParsedDate): GoalRow | null {
  for (const table of wikitext.split(/^\{\|/m).slice(1)) {
    const body = table.split(/^\|\}/m)[0]!;
    if (!/\bdate\b/i.test(body) || !/opponent/i.test(body) || /hat[- ]?trick/i.test(body.slice(0, 200))) continue;
    let goals = 0;
    let found: GoalRow | null = null;

    for (const row of body.split(/^\|-.*$/m)) {
      const c = cells(row);
      const at = c.findIndex((cell) => rowDate(cell, date));
      if (at < 0) continue;
      goals += Number(/rowspan\s*=\s*"?(\d+)/i.exec(c[at]!)?.[1] ?? 1);
      if (found) continue;
      const after = c.slice(at + 1);
      const opponent = after.find(isOpponent);
      if (!opponent) continue;
      const team = teamFrom(clean(opponent));
      if (!team.name) continue;
      const rest = after.slice(after.indexOf(opponent) + 1);
      const outcome = rest.find(isOutcome);
      const competition = rest.find((cell) => !scoreIn(clean(cell)) && !isOutcome(cell) && /[a-z]{3}/i.test(clean(cell)));
      found = {
        goals: 0,
        opponent: team.name,
        arOpponent: team.ar,
        result: outcome ? scoreIn(outcome) : undefined,
        competition: competition ? plainText(clean(competition))?.replace(/^\d+\s*$/, "") || undefined : undefined,
        venue: plainText(clean(after[0] ?? ""))?.split(",")[0],
      };
    }
    if (found) return { ...found, goals };
  }
  return null;
}

interface PagesResponse {
  query?: { redirects?: { from: string; to: string }[]; pages: { title: string; revisions?: { slots: { main: { content: string } } }[] }[] };
}

export const footballGoals: Adapter = {
  id: "wikipedia-goals",
  label: "Wikipedia international goal lists",
  unavailable: (d) => (LEGENDS.some((l) => d.year >= l.from && d.year <= l.to) ? null : { state: "out-of-range", note: "No listed player was active this year." }),
  async fetch(date) {
    const active = LEGENDS.filter((l) => date.year >= l.from && date.year <= l.to);
    const out: ArchiveRecord[] = [];
    for (let i = 0; i < active.length; i += 8) {
      const batch = active.slice(i, i + 8);
      const res = await fetchJson<PagesResponse>(
        `https://en.wikipedia.org/w/api.php?${qs({ action: "query", prop: "revisions", rvprop: "content", rvslots: "main", format: "json", formatversion: 2, titles: batch.map(listPage).join("|") })}`,
        { lane: "wikimedia", timeoutMs: 20_000 },
      );
      const pages = new Map((res.query?.pages ?? []).map((p) => [p.title, p]));
      for (const legend of batch) {
        const title = listPage(legend);
        const content = pages.get(title)?.revisions?.[0]?.slots.main.content;
        if (!content) continue;
        const row = parseGoals(content, date);
        if (!row || row.goals === 0) continue;
        const scored = row.goals === 1 ? "scored" : row.goals === 2 ? "scored twice" : row.goals === 3 ? "scored a hat-trick" : `scored ${row.goals}`;
        const wikiTitle = legend.page ?? legend.name;
        out.push(
          makeRecord({
            id: `goal-${slug(legend.name)}`,
            title: `${legend.name} ${scored} against ${row.opponent}`,
            summary: [row.competition, row.venue].filter(Boolean).join(", "),
            date,
            meaning: "occurred",
            category: "sports",
            wikiTitle,
            sitelinks: 40,
            meta: { imageTitle: wikiTitle, player: legend.name, opponent: row.opponent, arOpponent: row.arOpponent, goals: row.goals, score: row.result, competition: row.competition, venue: row.venue },
            evidence: [{ provider: "wikipedia-goals", label: `Wikipedia: ${title}`, url: wikiUrl(title), claimedDate: date.iso, license: "CC BY-SA 4.0", hasReference: true }],
          }),
        );
      }
    }
    return out;
  },
};
