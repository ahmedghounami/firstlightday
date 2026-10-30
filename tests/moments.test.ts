import { describe, expect, it } from "vitest";
import { arabicDate, fameBar, MAX_MOMENTS, selectMoments } from "@/lib/moments";
import { parseGoals } from "@/lib/sources/football-goals";
import { parseMatch } from "@/lib/sources/morocco-results";
import { makeRecord } from "@/lib/sources/record";
import { teamFrom } from "@/lib/sources/countries";
import { rank } from "@/lib/pipeline";
import { isMoroccan, type Entity } from "@/lib/sources/wikidata";
import type { Category, DateMeaning, RecordMeta } from "@/lib/types";

const DATE = { iso: "2022-12-18", year: 2022, month: 12, day: 18 };
const rec = (id: string, category: Category, sitelinks: number, meta: RecordMeta = {}, meaning: DateMeaning = "occurred") =>
  makeRecord({ id, title: id, date: DATE, meaning, category, sitelinks, meta, evidence: [{ provider: "wikidata", label: "w", url: "u", claimedDate: DATE.iso }] });

const GOALS = `{| class="wikitable"
|-
! scope="col" | No.
! scope="col" | Date
! scope="col" | Venue
! scope="col" | Opponent
! scope="col" | Score
! scope="col" | Result
! scope="col" | Competition
|-
| 95
| rowspan="2" | 18 December 2022
| rowspan="2" | [[Lusail Stadium]], Lusail, Qatar
| rowspan="2" | {{fb|FRA}}
| 1–0
| rowspan="2" align=center {{drew|3–3}}
| rowspan="2" | [[2022 FIFA World Cup]]
|-
| 96
| 3–2
|-
| 97
| 25 March 2023
| Buenos Aires
| {{fb|PAN}}
| 2–0
| align=center {{won|2–0}}
| Friendly
|}`;

describe("goal tables", () => {
  it("counts a date cell spanning rows as several goals", () => {
    const row = parseGoals(GOALS, DATE)!;
    expect(row.goals).toBe(2);
    expect(row.opponent).toBe("France");
    expect(row.arOpponent).toBe("فرنسا");
    expect(row.result).toBe("3–3");
    expect(row.competition).toBe("2022 FIFA World Cup");
  });
  it("finds nothing on a day without a goal", () => {
    expect(parseGoals(GOALS, { iso: "2022-12-19", year: 2022, month: 12, day: 19 })).toBeNull();
  });
  it("doesn't count a separate hat-tricks table twice", () => {
    const hatTricks = `{| class="wikitable"
|+ Hat-tricks
! Date !! Opponent
|-
| 18 December 2022 || {{fb|FRA}}
|}\n`;
    expect(parseGoals(GOALS + "\n" + hatTricks, DATE)!.goals).toBe(2);
  });
  it("does not match the same day in another year", () => {
    expect(parseGoals(GOALS, { iso: "2021-12-18", year: 2021, month: 12, day: 18 })).toBeNull();
  });
});

describe("Morocco matches", () => {
  const PAGE = `{{Football box collapsible|format=1
|round = [[Friendly]]
|date = 9 October 2020
|team1 = Morocco {{flagdeco|MAR}}
|score = 3–1
|team2 = {{fb|SEN}}
|goals1 =
*[[Selim Amallah|Amallah]] {{goal|10}}
*[[Youssef En-Nesyri|En-Nesyri]] {{goal|71}}
|goals2 =
*[[Ismaïla Sarr|I. Sarr]] {{goal|88}}
|stadium = [[Prince Moulay Abdellah Stadium]], Rabat
}}`;
  const day = { iso: "2020-10-09", year: 2020, month: 10, day: 9 };
  it("reads the match, in both languages", () => {
    const r = parseMatch(PAGE, day, "p")!;
    expect(r.title).toBe("Morocco 3–1 Senegal");
    expect(r.meta.arTitle).toBe("المغرب 3–1 السنغال");
    expect(r.meta.scorers).toEqual(["Amallah", "En-Nesyri"]);
    expect(r.meta.morocco).toBe(true);
  });
  it("ignores other days", () => expect(parseMatch(PAGE, { ...day, iso: "2020-10-10", day: 10 }, "p")).toBeNull());
  it("reads team templates", () => {
    expect(teamFrom("{{fb-rt|MAR}}").ar).toBe("المغرب");
    expect(teamFrom("{{fb|SEN}}").name).toBe("Senegal");
  });
});

describe("the fame bar", () => {
  it("keeps stars and drops unknowns", () => {
    expect(fameBar(rec("star", "born", 90), 1)).toBe(true);
    expect(fameBar(rec("nobody", "born", 4), 1)).toBe(false);
  });
  it("judges a song by its artist", () => {
    expect(fameBar(rec("song", "music", 3, { artistReach: 80 }, "released"), 1)).toBe(true);
  });
  it("uses a Moroccan bar for Moroccans", () => {
    expect(fameBar(rec("local star", "born", 6, { morocco: true }), 1)).toBe(true);
  });
});

describe("selecting moments", () => {
  it("excludes papers, TV listings, businesses and disputed records", () => {
    const ranked = rank([
      rec("paper", "science", 50, { citations: 900 }, "published"),
      rec("show", "tv", 60),
      rec("firm", "business", 60, {}, "founded"),
      { ...rec("contested", "born", 90), verification: "disputed" as const },
      rec("star", "born", 90),
    ]);
    expect(selectMoments(ranked).map((m) => m.id)).toEqual(["star"]);
  });
  it("puts Morocco first and shows its Arabic", () => {
    const moments = selectMoments(rank([rec("star", "born", 100), rec("ma", "born", 8, { morocco: true, arTitle: "نورة فتحي", arText: "ممثلة" })]));
    expect(moments[0]!.id).toBe("ma");
    expect(moments[0]!.arTitle).toBe("نورة فتحي");
  });
  it("doesn't carry Arabic on non-Moroccan moments", () => {
    expect(selectMoments(rank([rec("star", "born", 100, { arTitle: "اسم" })]))[0]!.arTitle).toBeUndefined();
  });
  it("relaxes the bar on a quiet day rather than showing nothing", () => {
    expect(selectMoments(rank([rec("a", "born", 40), rec("b", "died", 30)]))).toHaveLength(2);
  });
  it("stays short", () => {
    const many = Array.from({ length: 40 }, (_, i) => rec(`p${i}`, i % 2 ? "born" : "died", 90));
    expect(selectMoments(rank(many)).length).toBeLessThanOrEqual(MAX_MOMENTS);
  });
});

describe("Moroccan signals", () => {
  const person = (country: string): Entity => ({ id: "Q1", claims: { P27: [{ mainsnak: { datavalue: { type: "wikibase-entityid", value: { id: country } } }, rank: "normal" }] } });
  it("reads citizenship", () => {
    expect(isMoroccan(person("Q1028"))).toBe(true);
    expect(isMoroccan(person("Q142"))).toBe(false);
  });
  it("uses Moroccan month names", () => {
    expect(arabicDate({ iso: "2002-08-17", year: 2002, month: 8, day: 17 })).toBe("السبت 17 غشت 2002");
  });
});
