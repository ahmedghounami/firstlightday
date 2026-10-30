import { formatDate, weekday } from "./date";
import type { ArchiveRecord, Category, ParsedDate } from "./types";

export const confirmed = (records: ArchiveRecord[]) => records.filter((r) => r.verification !== "disputed");

const inCategory = (records: ArchiveRecord[], ...categories: Category[]) =>
  confirmed(records).filter((r) => categories.includes(r.category));

const NEWS: Category[] = ["world", "science", "technology", "business", "culture"];

/** Sports seasons and TV openers are real but are not the day's story, so the front page draws on news subjects. */
export function headlines(records: ArchiveRecord[], limit = 7): ArchiveRecord[] {
  const majorEvent = (r: ArchiveRecord) => r.meaning === "occurred" && r.sitelinks >= 25 && !["born", "died"].includes(r.category);
  const news = confirmed(records).filter((r) => majorEvent(r) || (NEWS.includes(r.category) && (r.summary.length > 0 || r.sitelinks > 3)));
  const major = news.filter((r) => !r.hidden);
  const chosen = major.length >= 3 ? major : [...major, ...news.filter((r) => r.hidden)];
  return chosen.slice(0, limit);
}

export const music = (records: ArchiveRecord[]) => inCategory(records, "music");
export const films = (records: ArchiveRecord[]) => inCategory(records, "film");
export const television = (records: ArchiveRecord[]) => inCategory(records, "tv");
export const sports = (records: ArchiveRecord[]) => inCategory(records, "sports");
export const science = (records: ArchiveRecord[]) => inCategory(records, "science", "technology");
export const business = (records: ArchiveRecord[]) => inCategory(records, "business");
export const born = (records: ArchiveRecord[]) => inCategory(records, "born");
export const died = (records: ArchiveRecord[]) => inCategory(records, "died");

/** Dated stories from regional and specialist pages, the ones a front page would never reach. */
export function hiddenStories(records: ArchiveRecord[]): ArchiveRecord[] {
  const front = new Set(headlines(records).map((r) => r.id));
  return confirmed(records).filter(
    (r) => r.hidden && !front.has(r.id) && r.evidence.some((e) => e.provider === "wikipedia-annual" || e.provider === "guardian" || e.provider === "wikipedia-portal"),
  );
}

export function capsule(records: ArchiveRecord[]): { lead?: ArchiveRecord; culture?: ArchiveRecord } {
  return { lead: headlines(records, 1)[0], culture: [...music(records), ...films(records)].sort((a, b) => b.score - a.score)[0] };
}

/** A count is only stated when it is true of what was retrieved. No mood, no weather, no invented atmosphere. */
export function introduction(date: ParsedDate, records: ArchiveRecord[], sourceCount: number): string {
  const total = confirmed(records).length;
  const opening = `${formatDate(date)} was a ${weekday(date)}.`;
  if (total === 0) return `${opening} We could not trace any verified records to this exact date.`;
  const entry = total === 1 ? "record" : "records";
  const from = sourceCount === 1 ? "one source" : `${sourceCount} sources`;
  return `${opening} We traced ${total} ${entry} to this exact date, from ${from}.`;
}

/** The summary, unless it only repeats the headline. */
export function extraSummary(r: ArchiveRecord): string {
  const title = r.title.replace(/…$/, "");
  return r.summary.length - title.length < 12 && r.summary.startsWith(title) ? "" : r.summary;
}

export const MEANING_LABEL: Record<ArchiveRecord["meaning"], string> = {
  occurred: "Happened",
  began: "Began",
  announced: "Announced",
  published: "Published",
  released: "Released",
  premiered: "Premiered",
  broadcast: "Broadcast",
  launched: "Launched",
  founded: "Founded",
  opened: "Opened",
  born: "Born",
  died: "Died",
};

export const CATEGORY_LABEL: Record<Category, string> = {
  world: "World", music: "Music", film: "Movies", tv: "Television", sports: "Sports", science: "Science",
  technology: "Technology", culture: "Culture", business: "Business", born: "Born", died: "Died",
};

export const VERIFICATION_LABEL: Record<ArchiveRecord["verification"], string> = {
  corroborated: "Corroborated",
  sourced: "Single source",
  disputed: "Disputed",
};

export function verificationNote(r: ArchiveRecord): string {
  if (r.verification === "disputed") return `Sources disagree on the day: ${[...new Set(r.evidence.map((e) => e.claimedDate))].join(", ")}.`;
  if (r.verification === "corroborated") return "Two independent datasets agree on this day, or the source cites its own reference.";
  return "One source states this exact day, without a reference we could follow.";
}
