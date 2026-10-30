import { describe, expect, it } from "vitest";
import { extractDatedLines, lineToRecord } from "@/lib/sources/wikipedia-annual";
import { parsePortal } from "@/lib/sources/wikipedia-portal";
import { headline, plainText, stripRefs } from "@/lib/wikitext";

const DATE = { iso: "2002-08-17", year: 2002, month: 8, day: 17 };

const PAGE = `
== Events ==
=== August ===
* [[August 7]] – Wrong day entirely.
* [[August 17]] – [[Elbe]] floods reach Dresden.<ref>{{Cite web |url=https://example.org/flood |title=x}}</ref>
* August 17–18 – A two-day summit is held.
* [[August 17]] – 19 – A three-day festival.
* [[August 170]] – Not a day.
* 17 August – British-format entry about a trial.
* [[August 17]]
** First nested event on the day.
** Second nested event on the day.
* [[August 18]] – Next day.
== Births ==
* August 17 – [[Chloe Hawthorn]], actress
== Deaths ==
* [[August 17]] – [[Someone]], writer (b. 1920)
== Nobel Prizes ==
* August 17 – Not really here.
`;

describe("annual page extraction", () => {
  const lines = extractDatedLines(PAGE, DATE).map((l) => l.raw);

  it("finds only events on that exact day", () => {
    expect(lines).toHaveLength(4);
    expect(lines.join()).toContain("Elbe");
    expect(lines.join()).toContain("British-format");
  });
  it("excludes ranges", () => expect(lines.join()).not.toMatch(/summit|festival/));
  it("excludes neighbouring days", () => expect(lines.join()).not.toMatch(/Wrong day|Next day|Not a day/));
  it("excludes births and deaths sections", () => expect(lines.join()).not.toMatch(/Hawthorn|Someone|Not really/));
  it("collects nested bullets under a bare date", () => expect(lines).toContain("First nested event on the day."));

  it("keeps the reference a line cites", () => {
    const record = lineToRecord({ raw: lines[0]! }, { title: () => "2002", primary: true }, "2002", DATE)!;
    expect(record.evidence[0]!.citedUrl).toBe("https://example.org/flood");
    expect(record.verification).toBe("corroborated");
    expect(record.wikiTitle).toBe("Elbe");
    expect(record.hidden).toBe(false);
  });
});

describe("plain text", () => {
  it("resolves links and convert templates", () => {
    expect(plainText("The [[Elbe]] crests at [[Dresden|the city]] at {{convert|30.84|ft|m}}.")).toBe("The Elbe crests at the city at 30.84 ft.");
  });
  it("fails closed on unknown templates", () => expect(plainText("Killed {{death toll|127}} soldiers")).toBeNull());
  it("drops decorations", () => expect(plainText("{{flagicon|UK}} [[London]] hosts a parade")).toBe("London hosts a parade"));
  it("strips portal-style citations and keeps the URL", () => {
    const out = stripRefs("Something happens. ([http://news.example/a BBC])");
    expect(out.text.trim()).toBe("Something happens.");
    expect(out.citedUrl).toBe("http://news.example/a");
  });
  it("makes headlines without adding words", () => {
    expect(headline("A short sentence. And another one.")).toBe("A short sentence");
    expect(headline("Vice President George H. W. Bush becomes acting president. He serves for hours.")).toBe("Vice President George H. W. Bush becomes acting president");
    expect(headline("A storm reaches St. Louis at dawn. Many flee.")).toBe("A storm reaches St. Louis at dawn");
    expect(headline("word ".repeat(60)).endsWith("…")).toBe(true);
    expect(headline("Extreme weather: The Elbe crests at Dresden.")).toBe("The Elbe crests at Dresden");
  });
});

describe("current events portal", () => {
  it("reads leaf bullets and section headings", () => {
    const text = `{{Current events|year=2002|content=
'''Sports'''
* [[Cricket]]
** Australia defeats Pakistan in a Test match at Sharjah.
'''Disasters'''
* [[Extreme weather]]: The Elbe crests at Dresden at a record height.
}}`;
    const records = parsePortal(text, DATE, "Portal:Current events/2002 August 17");
    expect(records.map((r) => r.category)).toEqual(["sports", "world"]);
    expect(records[0]!.title).toContain("Australia");
  });
});
