import { confirmed } from "./editorial";
import type { ArchiveImage, ArchiveRecord, ParsedDate } from "./types";

export type MomentKind = "news" | "born" | "died" | "music" | "film" | "goal" | "match" | "launch";

export interface Moment {
  id: string;
  kind: MomentKind;
  kicker: string;
  arKicker: string;
  title: string;
  line?: string;
  image?: ArchiveImage;
  youtube?: string;
  videoFile?: string;
  morocco: boolean;
  arTitle?: string;
  arLine?: string;
  /** Wikipedia article of the first Moroccan scorer, for an Arabic name. */
  scorerArticle?: string;
  score?: string;
  goals?: number;
  sourceLabel: string;
  sourceUrl: string;
  storyId: string;
}

const KICKERS: Record<MomentKind, [string, string]> = {
  news: ["The world", "حدث"],
  born: ["Born", "ميلاد"],
  died: ["In memory", "وفاة"],
  music: ["New music", "إصدار موسيقي"],
  film: ["Premiere", "عرض سينمائي"],
  goal: ["Goal", "هدف"],
  match: ["Match day", "مباراة"],
  launch: ["Launch", "إطلاق"],
};

const kindOf = (r: ArchiveRecord): MomentKind | null => {
  if (r.meta.goals) return "goal";
  if (r.meta.matchTitle) return "match";
  switch (r.category) {
    case "born":
      return "born";
    case "died":
      return "died";
    case "music":
      return "music";
    case "film":
      return r.meaning === "released" || r.meaning === "premiered" ? "film" : null;
    case "sports":
      return "match";
    case "world":
      return "news";
    case "science":
    case "technology":
      return r.meaning === "launched" || r.meaning === "released" ? "launch" : "news";
    default:
      return null;
  }
};

/** Papers and plain company foundings never make the story, however well linked. */
const isReel = (r: ArchiveRecord) => r.meta.citations === undefined && r.category !== "business" && r.category !== "culture" && r.category !== "tv";

const onFrontPage = (r: ArchiveRecord) => r.evidence.some((e) => /^Wikipedia: \d{4}$/.test(e.label) || e.provider === "wikipedia-onthisday");

/**
 * How famous is this? Wikipedia editions are the measure: the count of languages that wrote about it.
 * Moroccans are judged against Moroccan fame, or a global bar would drop nearly all of them.
 */
export function fameBar(r: ArchiveRecord, level: 1 | 2): boolean {
  const k = level === 1 ? 1 : 0.7;
  const reach = Math.max(r.sitelinks, r.meta.artistReach ?? 0);
  if (r.meta.morocco) return reach >= 3 || !!r.meta.goals || !!r.meta.matchTitle;
  if (r.meta.goals) return true;
  switch (kindOf(r)) {
    case "born":
      return reach >= 50 * k;
    case "died":
      return reach >= 40 * k;
    case "music":
      return reach >= 60 * k;
    case "film":
      return reach >= 30 * k;
    case "match":
      return reach >= 24 * k;
    case "launch":
      return reach >= 20 * k;
    case "news":
      return onFrontPage(r) || reach >= 25 * k;
    default:
      return false;
  }
}

const LIMITS: Record<MomentKind, number> = { news: 3, born: 3, died: 3, music: 3, film: 2, goal: 3, match: 2, launch: 1 };
const PACE: MomentKind[] = ["news", "goal", "born", "music", "match", "film", "died", "launch"];
export const MAX_MOMENTS = 12;

function toMoment(r: ArchiveRecord, kind: MomentKind): Moment {
  const [kicker, arKicker] = KICKERS[kind];
  const source = r.evidence[0];
  const artist = kind === "music" ? r.meta.artist : undefined;
  return {
    id: r.id,
    kind,
    kicker,
    arKicker,
    title: r.meta.matchTitle ?? r.title,
    line: (r.meta.matchTitle ? r.meta.scorers?.join(", ") : undefined) ?? artist ?? r.meta.occupation ?? (r.summary.length < 90 ? r.summary.replace(/\.$/, "") : undefined) ?? r.meta.competition,
    image: r.image,
    youtube: r.meta.youtube,
    videoFile: r.meta.videoFile,
    morocco: !!r.meta.morocco,
    arTitle: r.meta.morocco ? r.meta.arTitle : undefined,
    arLine: r.meta.morocco ? r.meta.arText : undefined,
    scorerArticle: r.meta.matchTitle ? r.meta.imageTitle : undefined,
    score: r.meta.score,
    goals: r.meta.goals,
    sourceLabel: (source?.label ?? "Source").replace(/^Wikipedia: /, "Wikipedia · "),
    sourceUrl: source?.url ?? "",
    storyId: r.id,
  };
}

/** Only the big things. Up to twelve, in an order that alternates subjects, with Morocco first. */
export function selectMoments(records: ArchiveRecord[]): Moment[] {
  const pool = confirmed(records).filter(isReel).sort((a, b) => b.score - a.score);
  let picked = pool.filter((r) => fameBar(r, 1));
  if (picked.length < 5) picked = pool.filter((r) => fameBar(r, 2));

  const groups = new Map<MomentKind, ArchiveRecord[]>();
  for (const r of picked) {
    const kind = kindOf(r);
    if (!kind) continue;
    const list = groups.get(kind) ?? [];
    if (list.length < LIMITS[kind]) list.push(r);
    groups.set(kind, list);
  }

  const ordered: Moment[] = [];
  for (let round = 0; round < 3; round++) {
    for (const kind of PACE) {
      const r = groups.get(kind)?.[round];
      if (r) ordered.push(toMoment(r, kind));
    }
  }
  const moroccan = ordered.filter((m) => m.morocco);
  return [...moroccan, ...ordered.filter((m) => !m.morocco)].slice(0, MAX_MOMENTS);
}

const AR_MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "ماي", "يونيو", "يوليوز", "غشت", "شتنبر", "أكتوبر", "نونبر", "دجنبر"];
const AR_DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

/** Moroccan month names, as used on Moroccan calendars. */
export function arabicDate(d: ParsedDate): string {
  const day = AR_DAYS[new Date(Date.UTC(d.year, d.month - 1, d.day)).getUTCDay()];
  return `${day} ${d.day} ${AR_MONTHS[d.month - 1]} ${d.year}`;
}
