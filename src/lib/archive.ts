import { cache } from "react";
import { unstable_cache } from "next/cache";
import { daysSince } from "./date";
import { articleContext, resolveImages, type ArticleContext } from "./images";
import { fetchJson, qs } from "./http";
import { selectMoments, type Moment } from "./moments";
import { mergeRecords, rank } from "./pipeline";
import { CORE_ADAPTERS, EXTRA_ADAPTERS } from "./sources";
import { verifyWithMusicBrainz } from "./sources/musicbrainz";
import { fetchFeed, otherYears } from "./sources/wikipedia-onthisday";
import type { Adapter, ArchiveImage, ArchiveRecord, OtherYearEvent, ParsedDate, ProviderReport } from "./types";

const MONTH = 60 * 60 * 24 * 30;
const DAY = 60 * 60 * 24;
const FAILURE_BACKOFF_MS = 5 * 60_000;

/** History is stable, but recent days are still being written up. */
const ttl = (date: ParsedDate) => (daysSince(date) < 30 ? DAY : MONTH);

const disabled = () => process.env.FIRSTLIGHT_NO_CACHE === "1";

/** Persistent cache around a loader. Throwing skips the cache, so failures are never stored as empty days. */
function persisted<T>(key: string[], date: ParsedDate, load: () => Promise<T>): Promise<T> {
  if (disabled()) return load();
  return unstable_cache(load, ["firstlight-v2", ...key], { revalidate: ttl(date) })();
}

const inFlight = new Map<string, Promise<unknown>>();
const recentFailures = new Map<string, { at: number; message: string }>();

function shared<T>(key: string, load: () => Promise<T>): Promise<T> {
  const running = inFlight.get(key) as Promise<T> | undefined;
  if (running) return running;
  const promise = load().finally(() => inFlight.delete(key));
  inFlight.set(key, promise);
  return promise;
}

export interface AdapterRun {
  records: ArchiveRecord[];
  report: ProviderReport;
}

export async function runAdapter(adapter: Adapter, date: ParsedDate): Promise<AdapterRun> {
  const base = { id: adapter.id, label: adapter.label };
  const blocked = adapter.unavailable?.(date);
  if (blocked) return { records: [], report: { ...base, ...blocked, count: 0 } };

  const key = `${adapter.id}:${date.iso}`;
  const failure = recentFailures.get(key);
  if (failure && Date.now() - failure.at < FAILURE_BACKOFF_MS) {
    return { records: [], report: { ...base, state: "failed", count: 0, note: failure.message } };
  }
  try {
    const records = await shared(key, () => persisted([adapter.id, date.iso], date, () => adapter.fetch(date)));
    return { records, report: { ...base, state: records.length ? "ok" : "empty", count: records.length } };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    recentFailures.set(key, { at: Date.now(), message });
    return { records: [], report: { ...base, state: "failed", count: 0, note: message } };
  }
}

export interface Archive {
  records: ArchiveRecord[];
  reports: ProviderReport[];
}

async function withImages(records: ArchiveRecord[], date: ParsedDate): Promise<ArchiveRecord[]> {
  const key = records.slice(0, 130).map((r) => r.id).join(",");
  let images: Record<string, ArchiveImage> = {};
  try {
    images = await persisted(["images", date.iso, String(hash(key))], date, () => resolveImages(records));
  } catch {
    // Missing pictures degrade to the typographic treatments.
  }
  return records.map((r) => (images[r.id] && !r.image ? { ...r, image: images[r.id] } : r));
}

function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return h;
}

/** Runs adapters in order so merged records keep stable ids between the two loading stages. */
function assemble(runs: AdapterRun[]): Archive {
  return { records: rank(mergeRecords(runs.flatMap((r) => r.records))), reports: runs.map((r) => r.report) };
}

async function loadCoreRuns(date: ParsedDate): Promise<AdapterRun[]> {
  return Promise.all(CORE_ADAPTERS.map((a) => runAdapter(a, date)));
}

export const getCoreRuns = cache(async (iso: string, date: ParsedDate) => {
  void iso;
  return loadCoreRuns(date);
});

/** The Wikimedia lane, which is fastest and carries the lead stories. */
export const getCore = cache(async (date: ParsedDate): Promise<Archive> => {
  const archive = assemble(await getCoreRuns(date.iso, date));
  return { ...archive, records: await withImages(archive.records, date) };
});

/** Everything, with independent date checks applied. */
export const getArchive = cache(async (date: ParsedDate): Promise<Archive> => {
  const core = await getCoreRuns(date.iso, date);
  const extra = await Promise.all(EXTRA_ADAPTERS.map((a) => runAdapter(a, date)));
  const merged = assemble([...core, ...extra]);

  const candidates = merged.records.filter((r) => r.category === "music" && r.meaning === "released" && r.meta.mbid);
  let report: ProviderReport = { id: "musicbrainz", label: "MusicBrainz", state: "empty", count: 0, note: "Used to double-check release dates." };
  let verified = merged.records;
  if (candidates.length) {
    try {
      const outcome = await persisted(["musicbrainz", date.iso, String(hash(candidates.map((c) => c.id).join()))], date, async () => {
        const result = await verifyWithMusicBrainz(merged.records);
        if (result.failed && result.checked === 0) throw new Error("MusicBrainz unavailable");
        return result;
      });
      verified = rank(outcome.records.map((r) => r));
      report = { ...report, state: outcome.checked ? "ok" : "empty", count: outcome.checked };
    } catch (err) {
      report = { ...report, state: "failed", note: err instanceof Error ? err.message : "Unknown error" };
    }
  }
  return { records: await withImages(verified, date), reports: [...merged.reports, report] };
});

/** The first sentence of the Arabic article, used only for Moroccan subjects that have one. */
async function arabicSentences(titles: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const title of titles) {
    const res = await fetchJson<{ query?: { pages: { title: string; extract?: string }[] } }>(
      `https://ar.wikipedia.org/w/api.php?${qs({ action: "query", prop: "extracts", exintro: 1, explaintext: 1, exchars: 170, redirects: 1, format: "json", formatversion: 2, titles: title })}`,
      { lane: "wikimedia-ar" },
    );
    const text = res.query?.pages[0]?.extract?.trim().split(/(?<=[.؟!])\s/)[0];
    if (text) out[title] = text;
  }
  return out;
}

/** A scorer's Arabic name, from the link between the two Wikipedias. */
async function arabicName(title: string): Promise<string | undefined> {
  const res = await fetchJson<{ query?: { pages: { langlinks?: { title: string }[] }[] } }>(
    `https://en.wikipedia.org/w/api.php?${qs({ action: "query", prop: "langlinks", lllang: "ar", redirects: 1, format: "json", formatversion: 2, titles: title })}`,
    { lane: "wikimedia" },
  );
  return res.query?.pages[0]?.langlinks?.[0]?.title.replace(/\s*\(.*\)$/, "");
}

/** YouTube's public oEmbed answers only for videos that exist and allow embedding. */
async function embeddable(id: string): Promise<boolean> {
  try {
    await fetchJson(`https://www.youtube.com/oembed?${qs({ url: `https://www.youtube.com/watch?v=${id}`, format: "json" })}`, { retries: 0, timeoutMs: 4000 });
    return true;
  } catch {
    return false;
  }
}

export const getMoments = cache(async (date: ParsedDate): Promise<Moment[]> => {
  const { records } = await getCore(date);
  const moments = selectMoments(records);
  return persisted(["moments-v2", date.iso, String(hash(moments.map((m) => m.id).join()))], date, async () => {
    const byId = new Map(records.map((r) => [r.id, r]));
    const titles = moments.filter((m) => m.morocco).map((m) => byId.get(m.id)?.meta.arWiki).filter((t): t is string => !!t);
    let arabic: Record<string, string> = {};
    try {
      arabic = await arabicSentences(titles);
    } catch {
      // Keep the Wikidata description.
    }
    return Promise.all(
      moments.map(async (m) => {
        const sentence = arabic[byId.get(m.id)?.meta.arWiki ?? ""];
        const ok = m.youtube ? await embeddable(m.youtube) : false;
        const scorer = m.scorerArticle ? await arabicName(m.scorerArticle).catch(() => undefined) : undefined;
        return { ...m, arLine: scorer ? `هدف ${scorer}` : (sentence ?? m.arLine), youtube: ok ? m.youtube : undefined };
      }),
    );
  });
});

export const getOtherYears = cache(async (date: ParsedDate): Promise<OtherYearEvent[]> => {
  try {
    return await shared(`other:${date.iso}`, () =>
      persisted(["other-years-v2", String(date.month), String(date.day)], date, async () => otherYears(await fetchFeed(date), date).slice(0, 60)),
    );
  } catch {
    return [];
  }
});

export const getArticleContext = cache(async (title: string, date: ParsedDate): Promise<ArticleContext | null> => {
  try {
    return await persisted(["article", title], date, () => articleContext(title));
  } catch {
    return null;
  }
});
