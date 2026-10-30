import { classifyEntity } from "../classify";
import { fetchJson, qs } from "../http";
import { regionOf } from "../regions";
import type { Adapter, ArchiveRecord, Category, ParsedDate, RecordMeta } from "../types";
import { wikiUrl } from "../wikitext";
import { makeRecord } from "./record";

const SPARQL = "https://query.wikidata.org/sparql";
const API = "https://www.wikidata.org/w/api.php";
const GREGORIAN = "http://www.wikidata.org/entity/Q1985727";

const EVENT_PROPERTIES = ["P585", "P580", "P577", "P571", "P619", "P1619", "P1191", "P606"];
const PERSON_PROPERTIES = ["P569", "P570"];

/** The truthy triple is the fast index; the value-node join then requires day precision, so a year-only "2002"
 *  stored as 2002-01-01 cannot use up a result slot on 1 January. One property per query: combining them times out. */
export function statementQuery(date: ParsedDate, property: string, minSitelinks: number, limit: number): string {
  const value = `"${date.iso}T00:00:00Z"^^xsd:dateTime`;
  return `SELECT DISTINCT ?i ?sl WHERE {
    ?i wdt:${property} ${value}; wikibase:sitelinks ?sl. FILTER(?sl >= ${minSitelinks})
    ?i p:${property}/psv:${property} [ wikibase:timeValue ${value}; wikibase:timePrecision 11; wikibase:timeCalendarModel <${GREGORIAN}> ]
  } ORDER BY DESC(?sl) LIMIT ${limit}`;
}

interface SparqlResponse {
  results: { bindings: { i: { value: string }; sl: { value: string } }[] };
}

interface Snak {
  datatype?: string;
  datavalue?: { value: unknown; type: string };
}
interface Claim {
  mainsnak: Snak;
  rank: "preferred" | "normal" | "deprecated";
  qualifiers?: Record<string, Snak[]>;
  references?: unknown[];
}
export interface Entity {
  id: string;
  labels?: { en?: { value: string }; ar?: { value: string } };
  descriptions?: { en?: { value: string }; ar?: { value: string } };
  claims?: Record<string, Claim[]>;
  sitelinks?: Record<string, { title: string }>;
}

interface TimeValue {
  time: string;
  precision: number;
  calendarmodel: string;
}

const entityId = (s?: Snak) => (s?.datavalue?.value as { id?: string } | undefined)?.id;

function claimDate(claim: Claim): { iso: string; precision: number } | null {
  const v = claim.mainsnak.datavalue?.value as TimeValue | undefined;
  if (!v?.time) return null;
  return { iso: v.time.replace(/^\+/, "").slice(0, 10), precision: v.precision };
}

const usable = (claims: Claim[] | undefined) => (claims ?? []).filter((c) => c.rank !== "deprecated");

/** Best-ranked statements, as Wikidata defines them: preferred ones win if any exist. */
function bestClaims(claims: Claim[] | undefined): Claim[] {
  const list = usable(claims);
  const preferred = list.filter((c) => c.rank === "preferred");
  return preferred.length ? preferred : list;
}

export interface DateEvidence {
  matches: boolean;
  /** Another best-ranked statement names a different exact day. */
  conflict?: string;
  referenced: boolean;
  qualifiers?: Record<string, Snak[]>;
  allDates: string[];
}

export function inspectDate(entity: Entity, property: string, iso: string): DateEvidence {
  const best = bestClaims(entity.claims?.[property]);
  const dated = best.map((c) => ({ c, d: claimDate(c) })).filter((x) => x.d?.precision === 11);
  const hit = dated.find((x) => x.d!.iso === iso);
  if (!hit) return { matches: false, referenced: false, allDates: [] };
  const others = dated.filter((x) => x.d!.iso !== iso);
  return {
    matches: true,
    conflict: others[0]?.d!.iso,
    referenced: (hit.c.references?.length ?? 0) > 0,
    qualifiers: hit.c.qualifiers,
    allDates: dated.map((x) => x.d!.iso),
  };
}

async function fetchEntities(ids: string[], props: string): Promise<Record<string, Entity>> {
  const out: Record<string, Entity> = {};
  for (let i = 0; i < ids.length; i += 50) {
    const res = await fetchJson<{ entities: Record<string, Entity> }>(
      `${API}?${qs({ action: "wbgetentities", ids: ids.slice(i, i + 50).join("|"), props, languages: "en|ar", format: "json" })}`,
      { lane: "wikidata", timeoutMs: 20_000 },
    );
    Object.assign(out, res.entities);
  }
  return out;
}

const ids = (entity: Entity, property: string) =>
  usable(entity.claims?.[property]).map((c) => entityId(c.mainsnak)).filter((x): x is string => !!x);

const MOROCCO = "Q1028";
const MOROCCAN_PROPERTIES = ["P27", "P17", "P495"];

export function isMoroccan(entity: Entity): boolean {
  return MOROCCAN_PROPERTIES.some((p) => ids(entity, p).includes(MOROCCO));
}

const stringValue = (entity: Entity, property: string) => usable(entity.claims?.[property])[0]?.mainsnak.datavalue?.value as string | undefined;

const LABELLED = ["P31", "P136", "P57", "P175", "P17", "P495", "P276", "P106", "P1346", "P641", "P291"];

export interface Candidate {
  id: string;
  property: string;
  sitelinks: number;
}

export function entityToRecord(
  entity: Entity,
  candidate: Candidate,
  date: ParsedDate,
  label: (id: string | undefined) => string | undefined,
): ArchiveRecord | null {
  const title = entity.labels?.en?.value;
  if (!title) return null; // Nothing to show an English reader; Q-numbers are not titles.
  const property = candidate.property;
  const evidence = inspectDate(entity, property, date.iso);
  if (!evidence.matches) return null;

  const description = entity.descriptions?.en?.value ?? "";
  const types = ids(entity, "P31").map(label).filter((x): x is string => !!x);
  const enwiki = entity.sitelinks?.enwiki?.title;
  const url = enwiki ? wikiUrl(enwiki) : `https://www.wikidata.org/wiki/${entity.id}`;
  const base = {
    id: `wd-${entity.id}-${property}`,
    title,
    date,
    qid: entity.id,
    wikiTitle: enwiki,
    sitelinks: candidate.sitelinks,
    summary: description ? description[0]!.toUpperCase() + description.slice(1) + "." : "",
    evidence: [
      {
        provider: "wikidata" as const,
        label: `Wikidata: ${entity.id}`,
        url: `https://www.wikidata.org/wiki/${entity.id}#${property}`,
        claimedDate: date.iso,
        license: "CC0",
        hasReference: evidence.referenced,
      },
    ],
  };

  let record: ArchiveRecord;
  if (property === "P569" || property === "P570") {
    const meaning = property === "P569" ? ("born" as const) : ("died" as const);
    const occupation = ids(entity, "P106").map(label).filter(Boolean).slice(0, 2).join(", ");
    const meta: RecordMeta = { occupation: occupation || undefined };
    if (meaning === "died") {
      const birth = bestClaims(entity.claims?.P569).map(claimDate).find((d) => d && d.precision >= 9);
      if (birth) {
        const by = Number(birth.iso.slice(0, 4));
        if (birth.precision === 11) {
          const [, bm = 0, bd = 0] = birth.iso.split("-").map(Number);
          meta.ageAtDeath = date.year - by - (date.month < bm || (date.month === bm && date.day < bd) ? 1 : 0);
        }
      }
    }
    record = makeRecord({ ...base, meaning, category: meaning as Category, region: regionOf(label(ids(entity, "P27")[0])), meta });
  } else {
    const kind = classifyEntity(types, description, property);
    if (!kind) return null;
    const country = label(ids(entity, "P17")[0]) ?? label(ids(entity, "P495")[0]);
    const place = label(ids(entity, "P276")[0]) ?? country;
    const meta: RecordMeta = {
      genres: ids(entity, "P136").map(label).filter((x): x is string => !!x).slice(0, 3),
      directors: ids(entity, "P57").map(label).filter((x): x is string => !!x).slice(0, 3),
      artist: ids(entity, "P175").map(label).filter(Boolean).slice(0, 2).join(", ") || undefined,
      mbid: (usable(entity.claims?.P436)[0]?.mainsnak.datavalue?.value as string | undefined) ?? undefined,
      competition: label(ids(entity, "P641")[0]),
    };
    if (kind.category === "music") meta.releaseType = types[0];
    if (kind.category === "film" && property === "P577") {
      meta.releaseCountry = label(entityId(evidence.qualifiers?.P291?.[0]));
      const every = usable(entity.claims?.P577).map(claimDate).filter((d) => d?.precision === 11).map((d) => d!.iso).sort();
      meta.earliestRelease = every[0] === date.iso;
    }
    record = makeRecord({
      ...base,
      meaning: kind.meaning,
      category: kind.category,
      region: regionOf(country),
      place,
      hidden: kind.hidden || candidate.sitelinks < 4,
      meta,
    });
  }

  record.meta.morocco = isMoroccan(entity) || undefined;
  record.meta.arTitle = entity.labels?.ar?.value;
  record.meta.arText = entity.descriptions?.ar?.value;
  record.meta.arWiki = entity.sitelinks?.arwiki?.title;
  record.meta.youtube = stringValue(entity, "P1651");
  record.meta.videoFile = stringValue(entity, "P10");

  // Two best-ranked statements naming different days: for works, different countries may legitimately differ.
  const regionalRelease = property === "P577" && (evidence.qualifiers?.P291?.length ?? 0) > 0;
  if (evidence.conflict && !regionalRelease) {
    record.verification = "disputed";
    record.evidence.push({ ...record.evidence[0]!, claimedDate: evidence.conflict, label: `Wikidata also states ${evidence.conflict}` });
  }
  return record;
}

/** Commons file named by the item, read later for licence details. */
export function entityImage(entity: Entity): string | undefined {
  return usable(entity.claims?.P18)[0]?.mainsnak.datavalue?.value as string | undefined;
}

/** Moroccans rarely reach the global top of a date's list, so they get their own search. */
export function moroccanQuery(date: ParsedDate, property: string, link: string): string {
  return `SELECT DISTINCT ?i ?sl WHERE {
    ?i wdt:${property} "${date.iso}T00:00:00Z"^^xsd:dateTime; ${link} wd:${MOROCCO}; wikibase:sitelinks ?sl.
  } ORDER BY DESC(?sl) LIMIT 15`;
}

const MOROCCAN_SEARCHES: [string, string][] = [
  ["P569", "wdt:P27"], ["P570", "wdt:P27"], ["P577", "wdt:P175/wdt:P27"], ["P577", "wdt:P495"], ["P585", "wdt:P17"], ["P580", "wdt:P17"],
];

async function candidates(date: ParsedDate): Promise<Candidate[]> {
  const out: Candidate[] = [];
  for (const property of EVENT_PROPERTIES.concat(PERSON_PROPERTIES)) {
    const person = PERSON_PROPERTIES.includes(property);
    const res = await fetchJson<SparqlResponse>(`${SPARQL}?${qs({ query: statementQuery(date, property, person ? 2 : 1, person ? 45 : 60), format: "json" })}`, {
      headers: { Accept: "application/sparql-results+json" },
      timeoutMs: 15_000,
      retries: 2,
      lane: "wdqs",
    });
    for (const b of res.results.bindings) out.push({ id: b.i.value.split("/").pop()!, property, sitelinks: Number(b.sl.value) });
  }
  for (const [property, link] of MOROCCAN_SEARCHES) {
    try {
      const res = await fetchJson<SparqlResponse>(`${SPARQL}?${qs({ query: moroccanQuery(date, property, link), format: "json" })}`, {
        headers: { Accept: "application/sparql-results+json" },
        timeoutMs: 8_000,
        retries: 0,
        lane: "wdqs",
      });
      for (const b of res.results.bindings) {
        const id = b.i.value.split("/").pop()!;
        if (!out.some((c) => c.id === id && c.property === property)) out.push({ id, property, sitelinks: Number(b.sl.value) });
      }
    } catch {
      // A slow extra search shouldn't cost the whole date.
    }
  }
  return out;
}

/** A single rarely has a free photo; its performer usually does, and the performer's fame is what makes it matter. */
async function addPerformers(records: ArchiveRecord[], entities: Record<string, Entity>): Promise<void> {
  const music = records.filter((r) => r.category === "music" && r.qid).slice(0, 40);
  const first = (r: ArchiveRecord) => ids(entities[r.qid!]!, "P175")[0];
  const wanted = [...new Set(music.map(first).filter((x): x is string => !!x))];
  if (!wanted.length) return;
  const performers = await fetchEntities(wanted, "labels|claims|sitelinks");
  for (const r of music) {
    const performer = performers[first(r) ?? ""];
    if (!performer) continue;
    r.meta.artistReach = Object.keys(performer.sitelinks ?? {}).length;
    r.meta.artistImageFile = entityImage(performer);
    if (ids(performer, "P27").includes(MOROCCO) || ids(performer, "P495").includes(MOROCCO)) r.meta.morocco = true;
    r.meta.arText ??= performer.labels?.ar?.value;
  }
}

export const wikidata: Adapter = {
  id: "wikidata",
  label: "Wikidata",
  async fetch(date) {
    const found = await candidates(date);
    const unique = [...new Set(found.map((c) => c.id))];
    const entities = await fetchEntities(unique, "labels|descriptions|claims|sitelinks");

    const wanted = new Set<string>();
    for (const e of Object.values(entities)) for (const p of [...LABELLED, "P27"]) ids(e, p).forEach((id) => wanted.add(id));
    const labelled = await fetchEntities([...wanted].slice(0, 500), "labels");
    const label = (id: string | undefined) => (id ? labelled[id]?.labels?.en?.value : undefined);

    const out: ArchiveRecord[] = [];
    for (const c of found) {
      const entity = entities[c.id];
      if (!entity) continue;
      const record = entityToRecord(entity, c, date, label);
      if (!record) continue;
      const file = entityImage(entity);
      if (file) record.meta.imageFile = file;
      out.push(record);
    }
    await addPerformers(out, entities);
    return out;
  },
};
