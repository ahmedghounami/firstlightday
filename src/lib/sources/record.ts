import type { ArchiveRecord, Category, DateMeaning, Evidence, ParsedDate, RecordMeta, Region } from "../types";

export interface RecordInput {
  id: string;
  title: string;
  summary?: string;
  date: ParsedDate;
  meaning: DateMeaning;
  category: Category;
  evidence: Evidence[];
  region?: Region;
  place?: string;
  wikiTitle?: string;
  qid?: string;
  sitelinks?: number;
  hidden?: boolean;
  meta?: RecordMeta;
}

export function makeRecord(input: RecordInput): ArchiveRecord {
  const hasStrongEvidence = input.evidence.some((e) => e.hasReference || e.citedUrl);
  return {
    id: input.id,
    title: input.title,
    summary: input.summary ?? "",
    date: input.date.iso,
    precision: "day",
    meaning: input.meaning,
    category: input.category,
    region: input.region,
    place: input.place,
    wikiTitle: input.wikiTitle,
    qid: input.qid,
    sitelinks: input.sitelinks ?? 0,
    hidden: input.hidden ?? false,
    verification: hasStrongEvidence ? "corroborated" : "sourced",
    evidence: input.evidence,
    meta: input.meta ?? {},
    score: 0,
    scoreParts: { reach: 0, sources: 0, international: 0, subject: 0, verification: 0 },
  };
}

export function slug(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .slice(0, 60);
}
