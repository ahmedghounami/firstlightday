import type { ArchiveRecord, Category, Evidence, ProviderId, ScoreParts } from "./types";

const STOP = new Set("the a an of in on at to for and or by with from as is was were are be has had his her its into after over during that this".split(" "));

const stem = (t: string) => t.replace(/(ings?|ers?|ed|es|s)$/, "");

function tokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1 && !STOP.has(t))
      .map((t) => (t.length > 4 ? stem(t) : t)),
  );
}

/** Same story in other words: enough distinctive words shared, measured against the shorter text. */
export function sameStory(a: string, b: string): boolean {
  const x = tokens(a);
  const y = tokens(b);
  let shared = 0;
  for (const t of x) if (y.has(t)) shared++;
  return shared >= 4 && shared / Math.min(x.size, y.size) >= 0.5;
}

export function similarity(a: string, b: string): number {
  const x = tokens(a);
  const y = tokens(b);
  if (!x.size || !y.size) return 0;
  let shared = 0;
  for (const t of x) if (y.has(t)) shared++;
  return shared / (x.size + y.size - shared);
}

const norm = (s?: string) => s?.toLowerCase().replace(/_/g, " ").trim();

function samePersonClass(a: ArchiveRecord, b: ArchiveRecord): boolean {
  const person = (r: ArchiveRecord) => r.category === "born" || r.category === "died";
  return person(a) === person(b) && (!person(a) || a.category === b.category);
}

/** Two records describe one thing. A shared first link alone is not enough: many events link the same country. */
export function isDuplicate(a: ArchiveRecord, b: ArchiveRecord): boolean {
  if (!samePersonClass(a, b)) return false;
  if (a.qid && a.qid === b.qid) return true;
  const sameTitle = !!a.wikiTitle && norm(a.wikiTitle) === norm(b.wikiTitle);
  if (a.category === "born" || a.category === "died") return sameTitle;
  if (sameTitle) {
    // One side is an item about exactly this article, or the wording overlaps.
    if (norm(a.title) === norm(a.wikiTitle) || norm(b.title) === norm(b.wikiTitle)) return true;
    if (similarity(a.summary || a.title, b.summary || b.title) >= 0.3) return true;
  }
  if (similarity(a.title, b.title) >= 0.72) return true;
  const news = (r: ArchiveRecord) => r.summary.length > 40 && r.evidence.some((e) => e.provider.startsWith("wikipedia"));
  return news(a) && news(b) && sameStory(a.summary, b.summary);
}

/** Sources drawing on the same underlying community count once. */
const FAMILY: Record<ProviderId, string> = {
  "wikipedia-annual": "wikipedia",
  "wikipedia-portal": "wikipedia",
  "wikipedia-onthisday": "wikipedia",
  wikidata: "wikidata",
  tvmaze: "tvmaze",
  "nasa-apod": "nasa",
  openalex: "openalex",
  thesportsdb: "thesportsdb",
  musicbrainz: "musicbrainz",
  tmdb: "tmdb",
  guardian: "guardian",
  "wikipedia-goals": "wikipedia",
  "wikipedia-morocco": "wikipedia",
};

export const sourceFamilies = (evidence: Evidence[]) => new Set(evidence.map((e) => FAMILY[e.provider])).size;

function dedupeEvidence(evidence: Evidence[]): Evidence[] {
  const seen = new Set<string>();
  return evidence.filter((e) => {
    const key = `${e.url}|${e.claimedDate}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mergeInto(base: ArchiveRecord, other: ArchiveRecord): ArchiveRecord {
  const evidence = dedupeEvidence([...base.evidence, ...other.evidence]);
  const disputed = base.verification === "disputed" || other.verification === "disputed";
  const prose = [base.summary, other.summary].sort((a, b) => b.length - a.length)[0] ?? "";
  // A sentence from a dated line says more than a Wikidata description.
  const fromLine = other.evidence.some((e) => e.provider.startsWith("wikipedia")) && base.evidence[0]?.provider === "wikidata";

  return {
    ...base,
    summary: fromLine && other.summary.length > 30 ? other.summary : prose,
    wikiTitle: base.wikiTitle ?? other.wikiTitle,
    qid: base.qid ?? other.qid,
    image: base.image ?? other.image,
    region: base.region ?? other.region,
    place: base.place ?? other.place,
    sitelinks: Math.max(base.sitelinks, other.sitelinks),
    hidden: base.hidden && other.hidden,
    evidence,
    meta: { ...other.meta, ...stripEmpty(base.meta) },
    verification: disputed ? "disputed" : base.verification === "corroborated" || other.verification === "corroborated" ? "corroborated" : "sourced",
  };
}

function stripEmpty<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && !(Array.isArray(v) && v.length === 0)),
  ) as Partial<T>;
}

/** Merges duplicates and applies evidence rules. Records keep the id of the first source that found them. */
export function mergeRecords(records: ArchiveRecord[]): ArchiveRecord[] {
  const merged: ArchiveRecord[] = [];
  for (const record of records) {
    const i = merged.findIndex((m) => isDuplicate(m, record));
    if (i >= 0) merged[i] = mergeInto(merged[i]!, record);
    else merged.push({ ...record });
  }
  return merged.map(applyEvidenceRules);
}

export function applyEvidenceRules(record: ArchiveRecord): ArchiveRecord {
  const days = new Set(record.evidence.map((e) => e.claimedDate));
  if (days.size > 1 || record.verification === "disputed") return { ...record, verification: "disputed" };
  if (sourceFamilies(record.evidence) >= 2) return { ...record, verification: "corroborated" };
  return record;
}

const SUBJECT_WEIGHT: Record<Category, number> = {
  world: 10, science: 8, technology: 6, business: 5, culture: 5, sports: 4, music: 4, film: 4, tv: 4, born: 3, died: 3,
};

/** Transparent and additive: every number here is shown on the story page. */
export function scoreRecord(record: ArchiveRecord): ScoreParts {
  const onMainRecord = record.evidence.some((e) => e.provider === "wikipedia-annual" && /^Wikipedia: \d{4}$/.test(e.label));
  const reported = record.evidence.some((e) => e.provider === "wikipedia-portal" || e.provider === "wikipedia-onthisday");
  return {
    reach: Math.round(Math.min(40, 18 * Math.log10(1 + record.sitelinks))),
    sources: Math.min(20, sourceFamilies(record.evidence) * 7 + (record.evidence.length > 1 ? 3 : 0)),
    international: onMainRecord ? 15 : reported ? 9 : record.sitelinks >= 20 ? 8 : 0,
    subject: SUBJECT_WEIGHT[record.category],
    verification: record.verification === "corroborated" ? 15 : record.verification === "sourced" ? 7 : 0,
  };
}

export function rank(records: ArchiveRecord[]): ArchiveRecord[] {
  return records
    .map((r) => {
      const scoreParts = scoreRecord(r);
      return { ...r, scoreParts, score: Object.values(scoreParts).reduce((a, b) => a + b, 0) };
    })
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}
