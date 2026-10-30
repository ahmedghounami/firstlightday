import { describe, expect, it } from "vitest";
import { headlines, hiddenStories, introduction } from "@/lib/editorial";
import { isDuplicate, mergeRecords, rank, similarity } from "@/lib/pipeline";
import { makeRecord } from "@/lib/sources/record";
import type { Evidence, ProviderId } from "@/lib/types";

const DATE = { iso: "2002-08-17", year: 2002, month: 8, day: 17 };
const ev = (provider: ProviderId, claimedDate = DATE.iso, extra: Partial<Evidence> = {}): Evidence => ({ provider, label: provider, url: `https://x/${provider}/${claimedDate}`, claimedDate, ...extra });

const rec = (id: string, title: string, over: Partial<Parameters<typeof makeRecord>[0]> = {}) =>
  makeRecord({ id, title, date: DATE, meaning: "occurred", category: "world", evidence: [ev("wikipedia-annual")], ...over });

describe("deduplication", () => {
  it("merges the same Wikidata item from two statements", () => {
    const a = rec("a", "Blue Crush", { qid: "Q1", evidence: [ev("wikidata")] });
    const b = rec("b", "Blue Crush (film)", { qid: "Q1", evidence: [ev("wikidata")] });
    expect(mergeRecords([a, b])).toHaveLength(1);
  });
  it("merges a dated line with the item for its article", () => {
    const item = rec("wd", "2002 European floods", { wikiTitle: "2002 European floods", evidence: [ev("wikidata")], sitelinks: 20 });
    const line = rec("wp", "Floods crest in Dresden", { wikiTitle: "2002 European floods", summary: "Floods crest in Dresden at a record height." });
    const [m] = mergeRecords([item, line]);
    expect(m!.evidence).toHaveLength(2);
    expect(m!.verification).toBe("corroborated");
    expect(m!.summary).toContain("Dresden");
    expect(m!.id).toBe("wd");
  });
  it("does not merge unrelated events sharing a first link", () => {
    const a = rec("a", "Germany wins a chess title in Bled", { wikiTitle: "Germany", summary: "Germany wins a chess title in Bled." });
    const b = rec("b", "Parliament votes on flood relief budget", { wikiTitle: "Germany", summary: "Parliament votes on flood relief budget." });
    expect(mergeRecords([a, b])).toHaveLength(2);
  });
  it("merges one story told in different words", () => {
    const a = rec("a", "x", { summary: "A suicide bombing occurs at a volleyball game in northwestern Pakistan, killing at least 95." });
    const b = rec("b", "y", { summary: "A suicide bomber killed 105 spectators at a volleyball game in the Lakki Marwat District of Pakistan." });
    expect(mergeRecords([a, b])).toHaveLength(1);
  });
  it("does not merge a birth with a death of the same name", () => {
    const a = rec("a", "Ann Lee", { category: "born", wikiTitle: "Ann Lee" });
    const b = rec("b", "Ann Lee", { category: "died", wikiTitle: "Ann Lee" });
    expect(isDuplicate(a, b)).toBe(false);
  });
  it("scores near-identical wording", () => expect(similarity("Elbe crests at Dresden", "The Elbe crests at Dresden")).toBe(1));
});

describe("verification", () => {
  it("is not corroborated by Wikipedia pages alone", () => {
    const a = rec("a", "An event with exactly the same words", { evidence: [ev("wikipedia-annual")] });
    const b = rec("b", "An event with exactly the same words", { evidence: [ev("wikipedia-onthisday")] });
    const [m] = mergeRecords([a, b]);
    expect(m!.verification).toBe("sourced");
  });
  it("flags sources that claim different days", () => {
    const a = rec("a", "Album X", { qid: "Q1", evidence: [ev("wikidata")] });
    const b = rec("b", "Album X", { qid: "Q1", evidence: [ev("musicbrainz", "2002-08-18")] });
    const [m] = mergeRecords([a, b]);
    expect(m!.verification).toBe("disputed");
  });
  it("keeps disputed records off the front page", () => {
    const d = { ...rec("d", "Contested event", { summary: "Contested event." }), verification: "disputed" as const };
    expect(headlines(rank([d]))).toHaveLength(0);
  });
});

describe("ranking", () => {
  it("rewards reach and evidence, and exposes the parts", () => {
    const small = rec("s", "Small", { sitelinks: 1 });
    const large = rec("l", "Large", { sitelinks: 80, evidence: [ev("wikipedia-annual", DATE.iso, { hasReference: true }), ev("wikidata")] });
    const ranked = rank(mergeRecords([small, large]));
    expect(ranked[0]!.id).toBe("l");
    const parts = ranked[0]!.scoreParts;
    expect(ranked[0]!.score).toBe(parts.reach + parts.sources + parts.international + parts.subject + parts.verification);
  });
  it("puts a major event on the front page whatever its subject", () => {
    const concert = rec("c", "Live Aid", { category: "music", sitelinks: 40 });
    expect(headlines(rank([concert]))[0]!.id).toBe("c");
  });
  it("uses hidden stories to fill out a thin front page", () => {
    const h = rec("h", "Regional story", { hidden: true, summary: "Regional story here." });
    expect(headlines(rank([h]))[0]!.id).toBe("h");
    expect(hiddenStories(rank([h]))).toHaveLength(0);
  });
});

describe("introduction", () => {
  it("states only counts and the calendar", () => {
    expect(introduction(DATE, [], 0)).toContain("could not trace");
    expect(introduction(DATE, [rec("a", "A")], 1)).toBe("17 August 2002 was a Saturday. We traced 1 record to this exact date, from one source.");
  });
});
