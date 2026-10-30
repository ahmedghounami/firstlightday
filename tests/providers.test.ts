import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchJson, ProviderError } from "@/lib/http";
import { resolveImages, toArchiveImage } from "@/lib/images";
import { guardian, itemsToRecords } from "@/lib/sources/guardian";
import { applyReleaseGroup, verifyWithMusicBrainz } from "@/lib/sources/musicbrainz";
import { apodToRecord } from "@/lib/sources/nasa-apod";
import { worksToRecords } from "@/lib/sources/openalex";
import { makeRecord } from "@/lib/sources/record";
import { eventsToRecords } from "@/lib/sources/thesportsdb";
import { moviesToRecords, tmdb } from "@/lib/sources/tmdb";
import { scheduleToRecords, type ScheduleEntry } from "@/lib/sources/tvmaze";
import { exactRecords, otherYears, type Feed } from "@/lib/sources/wikipedia-onthisday";

const DATE = { iso: "2002-08-17", year: 2002, month: 8, day: 17 };

const ep = (airdate: string, over: Partial<ScheduleEntry> = {}): ScheduleEntry => ({
  id: 1, url: "https://tv/1", name: "Pilot", season: 2, number: 3, airdate,
  show: { name: "Show", url: "https://tv/s", weight: 60, premiered: "2000-01-01", network: { name: "NBC" } }, ...over,
});

describe("TVmaze", () => {
  it("drops episodes the schedule leaks from the previous day", () => {
    expect(scheduleToRecords([ep("2002-08-16"), ep("2002-08-17")], DATE, "United States")).toHaveLength(1);
  });
  it("separates premieres from ordinary broadcasts", () => {
    const [r] = scheduleToRecords([ep("2002-08-17", { season: 1, number: 1 })], DATE, "United States");
    expect(r!.meaning).toBe("premiered");
    expect(scheduleToRecords([ep("2002-08-17")], DATE, "United States")[0]!.meaning).toBe("broadcast");
  });
});

describe("On This Day feed", () => {
  const feed: Feed = {
    events: [{ text: "Same year event", year: 2002 }, { text: "Other year event", year: 1998 }],
    births: [{ text: "Born same year", year: 2002 }, { text: "Born another year", year: 1969 }],
  };
  it("never lets another year into the exact-date set", () => {
    const records = exactRecords(feed, DATE);
    expect(records.map((r) => r.summary)).toEqual(["Same year event", "Born same year"]);
  });
  it("lists an event once when the feed repeats it in other words", () => {
    const repeated: Feed = {
      selected: [{ text: "Aboard the Space Shuttle Challenger, astronaut Kathryn D. Sullivan becomes the first American woman to walk in space.", year: 1984 }],
      events: [
        { text: "Aboard the Space Shuttle Challenger, astronaut Kathryn D. Sullivan becomes the first American woman to perform a space walk.", year: 1984 },
        { text: "A different event in the same year.", year: 1984 },
      ],
    };
    const other = otherYears(repeated, DATE);
    expect(other).toHaveLength(2);
    expect(new Set(other.map((o) => o.id)).size).toBe(2);
  });
  it("keeps other years in their own labelled list", () => {
    const other = otherYears(feed, DATE);
    expect(other).toHaveLength(1);
    expect(other[0]!.year).toBe(1998);
  });
});

describe("APOD", () => {
  it("rejects the placeholder the API returns for old dates", () => {
    expect(apodToRecord({ date: DATE.iso, title: "NASA Science", media_type: "image", url: "https://x/nasa-logo.png" }, DATE)).toBeNull();
  });
  it("does not display credited images", () => {
    const r = apodToRecord({ date: DATE.iso, title: "Orion", media_type: "image", url: "https://x/a.jpg", copyright: "A Photographer" }, DATE)!;
    expect(r.image).toBeUndefined();
    expect(apodToRecord({ date: DATE.iso, title: "Orion", media_type: "image", url: "http://x/a.jpg" }, DATE)!.image?.src).toBe("https://x/a.jpg");
  });
});

describe("OpenAlex", () => {
  const work = { id: "https://openalex.org/W1", title: "A paper", publication_date: DATE.iso, cited_by_count: 10 };
  it("requires the exact date", () => expect(worksToRecords([{ ...work, publication_date: "2002-08-18" }], DATE)).toHaveLength(0));
  it("distrusts 31 December", () => expect(worksToRecords([{ ...work, publication_date: "1999-12-31" }], { iso: "1999-12-31", year: 1999, month: 12, day: 31 })).toHaveLength(0));
  it("distrusts the first of the month", () => expect(worksToRecords([{ ...work, publication_date: "2002-08-01" }], { ...DATE, iso: "2002-08-01", day: 1 })).toHaveLength(0));
});

describe("TheSportsDB", () => {
  it("does not invent a score for a fixture without one", () => {
    const [r] = eventsToRecords([{ idEvent: "1", strEvent: "A vs B", dateEvent: DATE.iso, intHomeScore: null, intAwayScore: null }], DATE);
    expect(r!.meta.score).toBeUndefined();
  });
  it("shows a verified score", () => {
    const [r] = eventsToRecords([{ idEvent: "1", strEvent: "A vs B", dateEvent: DATE.iso, intHomeScore: "2", intAwayScore: "0" }], DATE);
    expect(r!.meta.score).toBe("2–0");
  });
  it("drops other dates", () => expect(eventsToRecords([{ idEvent: "1", strEvent: "A", dateEvent: "2002-08-18" }], DATE)).toHaveLength(0));
});

describe("MusicBrainz check", () => {
  const record = makeRecord({ id: "a", title: "A", date: DATE, meaning: "released", category: "music", evidence: [{ provider: "wikidata", label: "w", url: "u", claimedDate: DATE.iso }] });
  it("corroborates a matching day", () => {
    expect(applyReleaseGroup(record, { id: "1", title: "A", "first-release-date": DATE.iso }).verification).toBe("corroborated");
  });
  it("disputes a different day", () => {
    expect(applyReleaseGroup(record, { id: "1", title: "A", "first-release-date": "2002-08-19" }).verification).toBe("disputed");
  });
  it("does not compare an event with a later recording of it", async () => {
    const concert = { ...record, meaning: "occurred" as const, meta: { mbid: "x" } };
    globalThis.fetch = vi.fn();
    const out = await verifyWithMusicBrainz([concert]);
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(out.records[0]!.verification).toBe(concert.verification);
  });
  it("treats a year-only date as no evidence", () => {
    expect(applyReleaseGroup(record, { id: "1", title: "A", "first-release-date": "2002" })).toBe(record);
  });
});

describe("keyed sources", () => {
  it("TMDB and Guardian map only exact dates", () => {
    expect(moviesToRecords([{ id: 1, title: "F", release_date: "2002-08-18" }], DATE)).toHaveLength(0);
    expect(moviesToRecords([{ id: 1, title: "F", release_date: DATE.iso, poster_path: "/p.jpg" }], DATE)[0]!.image?.src).toContain("/p.jpg");
    expect(itemsToRecords([{ id: "a/b", webTitle: "T", webUrl: "u", webPublicationDate: "2002-08-18T00:00:00Z" }], DATE)).toHaveLength(0);
  });
  it("report as unconfigured rather than failing when no key is set", () => {
    vi.stubEnv("TMDB_API_KEY", "");
    vi.stubEnv("GUARDIAN_API_KEY", "");
    expect(tmdb.unavailable?.(DATE)?.state).toBe("unconfigured");
    expect(guardian.unavailable?.(DATE)?.state).toBe("unconfigured");
    vi.unstubAllEnvs();
  });
});

describe("images", () => {
  it("refuses images with no licence metadata or a non-free one", () => {
    expect(toArchiveImage("a.jpg", { thumburl: "u", mime: "image/jpeg", extmetadata: {} })).toBeNull();
    expect(toArchiveImage("a.jpg", { thumburl: "u", mime: "image/jpeg", extmetadata: { LicenseShortName: { value: "Fair use" } } })).toBeNull();
    expect(toArchiveImage("a.jpg", { thumburl: "u", mime: "image/jpeg", extmetadata: { LicenseShortName: { value: "CC BY-SA 4.0" } } })?.license).toBe("CC BY-SA 4.0");
  });
});

describe("http failures", () => {
  const original = globalThis.fetch;
  beforeEach(() => vi.useRealTimers());
  afterEach(() => {
    globalThis.fetch = original;
  });

  it("retries a 503 then succeeds", async () => {
    const f = vi.fn()
      .mockResolvedValueOnce(new Response("busy", { status: 503 }))
      .mockResolvedValueOnce(new Response('{"ok":true}'));
    globalThis.fetch = f;
    await expect(fetchJson("https://x/y", { retries: 1 })).resolves.toEqual({ ok: true });
    expect(f).toHaveBeenCalledTimes(2);
  });
  it("does not retry a 404", async () => {
    const f = vi.fn().mockResolvedValue(new Response("no", { status: 404 }));
    globalThis.fetch = f;
    await expect(fetchJson("https://x/y", { retries: 2 })).rejects.toBeInstanceOf(ProviderError);
    expect(f).toHaveBeenCalledTimes(1);
  });
  it("rejects malformed JSON without retrying forever", async () => {
    globalThis.fetch = vi.fn().mockImplementation(async () => new Response("<html>"));
    await expect(fetchJson("https://x/y", { retries: 0 })).rejects.toThrow("Malformed");
  });
  it("loses only pictures when the image lookup fails", async () => {
    globalThis.fetch = vi.fn().mockImplementation(async () => new Response("x", { status: 500 }));
    const record = makeRecord({ id: "a", title: "A", date: DATE, meaning: "occurred", category: "world", evidence: [], wikiTitle: "A", qid: "Q1" });
    await expect(resolveImages([record])).rejects.toBeInstanceOf(ProviderError);
  }, 15000);
});
