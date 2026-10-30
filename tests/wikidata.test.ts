import { describe, expect, it } from "vitest";
import { classifyEntity, classifyText } from "@/lib/classify";
import { entityToRecord, inspectDate, statementQuery, type Entity } from "@/lib/sources/wikidata";

const DATE = { iso: "2002-08-17", year: 2002, month: 8, day: 17 };
const GREG = "http://www.wikidata.org/entity/Q1985727";

const time = (iso: string, precision = 11) => ({ datavalue: { type: "time", value: { time: `+${iso}T00:00:00Z`, precision, calendarmodel: GREG } } });
const claim = (iso: string, precision = 11, rank: "normal" | "preferred" | "deprecated" = "normal", references?: unknown[]) => ({ mainsnak: time(iso, precision), rank, references });
const item = (id: string) => ({ datavalue: { type: "wikibase-entityid", value: { id } } });

const LABELS: Record<string, string> = { Q1: "album", Q2: "film", Q3: "United States", Q4: "singer", Q5: "human" };
const label = (id?: string) => (id ? LABELS[id] : undefined);

const entity = (over: Partial<Entity>): Entity => ({ id: "Q99", labels: { en: { value: "Thing" } }, descriptions: { en: { value: "a thing" } }, claims: {}, ...over });

describe("statement query", () => {
  it("demands day precision and the Gregorian calendar", () => {
    const q = statementQuery(DATE, "P585", 1, 10);
    expect(q).toContain("wikibase:timePrecision 11");
    expect(q).toContain("Q1985727");
    expect(q).toContain('"2002-08-17T00:00:00Z"');
  });
});

describe("date precision", () => {
  it("rejects year-precision values stored on 1 January", () => {
    const e = entity({ claims: { P577: [claim("2002-01-01", 9)] } });
    expect(inspectDate(e, "P577", "2002-01-01").matches).toBe(false);
  });
  it("rejects month-precision values", () => {
    const e = entity({ claims: { P577: [claim("2002-08-01", 10)] } });
    expect(inspectDate(e, "P577", "2002-08-01").matches).toBe(false);
  });
  it("ignores deprecated statements", () => {
    const e = entity({ claims: { P569: [claim("2002-08-17", 11, "deprecated")] } });
    expect(inspectDate(e, "P569", "2002-08-17").matches).toBe(false);
  });
  it("lets a preferred statement outrank a normal one", () => {
    const e = entity({ claims: { P569: [claim("2002-08-17", 11, "normal"), claim("2002-08-18", 11, "preferred")] } });
    expect(inspectDate(e, "P569", "2002-08-17").matches).toBe(false);
  });
  it("detects conflicting days", () => {
    const e = entity({ claims: { P569: [claim("2002-08-17"), claim("2002-08-18")] } });
    expect(inspectDate(e, "P569", "2002-08-17").conflict).toBe("2002-08-18");
  });
});

describe("entity to record", () => {
  it("marks conflicting birth dates as disputed", () => {
    const e = entity({ claims: { P569: [claim("2002-08-17"), claim("2002-08-18")] } });
    const r = entityToRecord(e, { id: "Q99", property: "P569", sitelinks: 5 }, DATE, label)!;
    expect(r.verification).toBe("disputed");
    expect(r.category).toBe("born");
  });
  it("treats regional release dates as different releases, not a dispute", () => {
    const e = entity({
      claims: {
        P31: [{ mainsnak: item("Q2"), rank: "normal" }],
        P577: [
          { ...claim("2002-08-17"), qualifiers: { P291: [item("Q3")] } },
          { ...claim("2002-09-20"), qualifiers: { P291: [item("Q6")] } },
        ],
      },
    });
    const r = entityToRecord(e, { id: "Q99", property: "P577", sitelinks: 5 }, DATE, label)!;
    expect(r.verification).not.toBe("disputed");
    expect(r.meta.releaseCountry).toBe("United States");
    expect(r.meta.earliestRelease).toBe(true);
  });
  it("skips items with no English label", () => {
    const e = entity({ labels: {}, claims: { P569: [claim("2002-08-17")] } });
    expect(entityToRecord(e, { id: "Q99", property: "P569", sitelinks: 5 }, DATE, label)).toBeNull();
  });
  it("computes age at death from exact dates only", () => {
    const e = entity({ claims: { P570: [claim("2002-08-17")], P569: [claim("1950-08-18")] } });
    const r = entityToRecord(e, { id: "Q99", property: "P570", sitelinks: 5 }, DATE, label)!;
    expect(r.meta.ageAtDeath).toBe(51);
  });
});

describe("classification", () => {
  it("assigns the date meaning by property", () => {
    expect(classifyEntity(["album"], "", "P577")).toEqual({ category: "music", meaning: "released" });
    expect(classifyEntity(["film"], "", "P577")?.category).toBe("film");
    expect(classifyEntity(["spacecraft"], "", "P619")).toEqual({ category: "science", meaning: "launched" });
    expect(classifyEntity(["business"], "", "P571")).toEqual({ category: "business", meaning: "founded" });
    expect(classifyEntity(["television series"], "", "P580")).toEqual({ category: "tv", meaning: "premiered" });
    expect(classifyEntity(["sports season"], "", "P580")).toEqual({ category: "sports", meaning: "began" });
  });
  it("drops calendar pages and place items", () => {
    expect(classifyEntity(["calendar day of a given year"], "", "P585")).toBeNull();
    expect(classifyEntity(["human settlement"], "", "P571")).toBeNull();
    expect(classifyEntity(["hospital"], "medical facility", "P571")).toBeNull();
    expect(classifyEntity(["literary work"], "", "P571")).toBeNull();
  });
  it("keeps unknown things out", () => expect(classifyEntity(["mystery"], "", "P585")).toBeNull());
  it("classifies free text conservatively", () => {
    expect(classifyText("Arsenal wins the Premier League")).toBe("sports");
    expect(classifyText("Parliament is dissolved")).toBe("world");
  });
});
