/** What the date attached to a record actually means. Never collapsed into a generic "date". */
export type DateMeaning =
  | "occurred"
  | "began"
  | "announced"
  | "published"
  | "released"
  | "premiered"
  | "broadcast"
  | "launched"
  | "founded"
  | "opened"
  | "born"
  | "died";

export type DatePrecision = "day" | "month" | "year";

export type Category =
  | "world"
  | "music"
  | "film"
  | "tv"
  | "sports"
  | "science"
  | "technology"
  | "culture"
  | "business"
  | "born"
  | "died";

export type Region = "Africa" | "Asia" | "Europe" | "North America" | "South America" | "Oceania" | "Worldwide";

/**
 * Derived from evidence, never from a model:
 * - corroborated: two independent sources agree on the day, or one cites a reference.
 * - sourced: one source states the day at day precision, no reference attached.
 * - disputed: sources disagree. Kept out of confirmed sections.
 */
export type Verification = "corroborated" | "sourced" | "disputed";

export interface Evidence {
  provider: ProviderId;
  /** Human label for the link, such as a page title. */
  label: string;
  url: string;
  /** The exact date this source states. */
  claimedDate: string;
  license?: string;
  /** Reference cited by the source itself, when it gives one. */
  citedUrl?: string;
  hasReference?: boolean;
}

export interface ArchiveImage {
  src: string;
  width: number;
  height: number;
  alt: string;
  credit: string;
  license: string;
  pageUrl: string;
}

export interface RecordMeta {
  artist?: string;
  releaseType?: string;
  genres?: string[];
  directors?: string[];
  occupation?: string;
  releaseCountry?: string;
  /** True when this date is the earliest release date on record for the work. */
  earliestRelease?: boolean;
  competition?: string;
  score?: string;
  venue?: string;
  network?: string;
  isPremiere?: boolean;
  citations?: number;
  journal?: string;
  publisher?: string;
  mbid?: string;
  ageAtDeath?: number;
  /** Commons filename named by Wikidata; resolved to an ArchiveImage after licence lookup. */
  imageFile?: string;
  apodImage?: boolean;
  /** The record concerns Morocco: a Moroccan person or artist, or something that happened there. */
  morocco?: boolean;
  arTitle?: string;
  arText?: string;
  /** Arabic Wikipedia article title, for a sourced Arabic sentence. */
  arWiki?: string;
  youtube?: string;
  videoFile?: string;
  artistImageFile?: string;
  /** Wikipedia editions covering the artist: how well known they are, not the single song. */
  artistReach?: number;
  player?: string;
  opponent?: string;
  arOpponent?: string;
  goals?: number;
  scorers?: string[];
  matchTitle?: string;
  /** Article whose free lead image illustrates this record: a scorer, or the player. */
  imageTitle?: string;
}

export interface ArchiveRecord {
  id: string;
  title: string;
  summary: string;
  date: string;
  precision: DatePrecision;
  meaning: DateMeaning;
  category: Category;
  region?: Region;
  place?: string;
  image?: ArchiveImage;
  wikiTitle?: string;
  qid?: string;
  /** Count of Wikipedia editions covering the subject. A proxy for reach, not importance. */
  sitelinks: number;
  /** Stories outside the main annual record: regional pages, minor items. */
  hidden: boolean;
  verification: Verification;
  evidence: Evidence[];
  meta: RecordMeta;
  score: number;
  scoreParts: ScoreParts;
}

export interface ScoreParts {
  reach: number;
  sources: number;
  international: number;
  subject: number;
  verification: number;
}

/** A same-month-and-day event from another year. A separate type so it cannot enter the exact-date list. */
export interface OtherYearEvent {
  id: string;
  year: number;
  text: string;
  url: string;
  wikiTitle?: string;
}

export type ProviderId =
  | "wikipedia-annual"
  | "wikipedia-portal"
  | "wikipedia-onthisday"
  | "wikidata"
  | "tvmaze"
  | "nasa-apod"
  | "openalex"
  | "thesportsdb"
  | "musicbrainz"
  | "tmdb"
  | "guardian"
  | "wikipedia-goals"
  | "wikipedia-morocco";

export type ProviderState = "ok" | "empty" | "failed" | "unconfigured" | "out-of-range";

export interface ProviderReport {
  id: ProviderId;
  label: string;
  state: ProviderState;
  count: number;
  note?: string;
}

export interface Adapter {
  id: ProviderId;
  label: string;
  /** Returning null means the adapter cannot run for this date; the reason is given by `unavailable`. */
  unavailable?: (date: ParsedDate) => { state: "unconfigured" | "out-of-range"; note: string } | null;
  fetch: (date: ParsedDate) => Promise<ArchiveRecord[]>;
}

export interface ParsedDate {
  iso: string;
  year: number;
  month: number;
  day: number;
}
