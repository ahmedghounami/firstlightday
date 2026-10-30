import { fetchJson, qs } from "./http";
import type { ArchiveImage, ArchiveRecord } from "./types";

interface ImageInfo {
  thumburl?: string;
  thumbwidth?: number;
  thumbheight?: number;
  descriptionurl?: string;
  mime?: string;
  extmetadata?: Record<string, { value: string } | undefined>;
}

const strip = (html = "") => html.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

/** An image without readable licence metadata is treated as unusable. */
export function toArchiveImage(file: string, info: ImageInfo | undefined): Omit<ArchiveImage, "alt"> | null {
  const license = strip(info?.extmetadata?.LicenseShortName?.value);
  if (!info?.thumburl || !license || !info.mime?.startsWith("image/") || /fair use|non-?free/i.test(license)) return null;
  return {
    src: info.thumburl,
    width: info.thumbwidth ?? 900,
    height: info.thumbheight ?? 600,
    credit: strip(info.extmetadata?.Artist?.value).slice(0, 100) || "Wikimedia Commons",
    license,
    pageUrl: info.descriptionurl ?? `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file)}`,
  };
}

async function commonsInfo(files: string[]): Promise<Map<string, Omit<ArchiveImage, "alt">>> {
  const out = new Map<string, Omit<ArchiveImage, "alt">>();
  for (let i = 0; i < files.length; i += 40) {
    const batch = files.slice(i, i + 40);
    const res = await fetchJson<{
      query?: { normalized?: { from: string; to: string }[]; pages: { title: string; imageinfo?: ImageInfo[] }[] };
    }>(
      `https://commons.wikimedia.org/w/api.php?${qs({
        action: "query", prop: "imageinfo", iiprop: "url|mime|extmetadata", iiurlwidth: 960,
        iiextmetadatafilter: "LicenseShortName|Artist", format: "json", formatversion: 2,
        titles: batch.map((f) => `File:${f}`).join("|"),
      })}`,
      { lane: "commons" },
    );
    for (const page of res.query?.pages ?? []) {
      const file = page.title.replace(/^File:/, "");
      const img = toArchiveImage(file, page.imageinfo?.[0]);
      if (img) out.set(file, img);
    }
  }
  return out;
}

/** Free-licensed lead images only; `pilicense=free` keeps out the fair-use posters and logos held on enwiki. */
async function articleImages(titles: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (let i = 0; i < titles.length; i += 50) {
    const res = await fetchJson<{
      query?: { normalized?: { from: string; to: string }[]; pages: { title: string; pageimage?: string }[] };
    }>(
      `https://en.wikipedia.org/w/api.php?${qs({
        action: "query", prop: "pageimages", piprop: "name", pilicense: "free", pilimit: 50, redirects: 1, format: "json", formatversion: 2,
        titles: titles.slice(i, i + 50).join("|"),
      })}`,
      { lane: "wikimedia" },
    );
    for (const p of res.query?.pages ?? []) if (p.pageimage) out.set(p.title, p.pageimage);
  }
  return out;
}

/** Map of record id to licensed image. Failure here only loses pictures, so it is swallowed by the caller. */
export async function resolveImages(records: ArchiveRecord[], limit = 130): Promise<Record<string, ArchiveImage>> {
  // A dated line's first link is often a broad topic ("Extreme weather"), whose picture shows some other event.
  // Only records that are themselves the article's subject take its image.
  const moroccanFirst = [...records].sort((a, b) => Number(!!b.meta.morocco) - Number(!!a.meta.morocco));
  const targets = moroccanFirst.filter((r) => !r.image && (r.qid || r.meta.imageFile || r.meta.imageTitle)).slice(0, limit);
  const article = (r: ArchiveRecord) => r.meta.imageTitle ?? r.wikiTitle;
  const needLookup = targets.filter((r) => !r.meta.imageFile && !r.meta.artistImageFile && article(r)).map((r) => article(r)!);
  const byTitle = needLookup.length ? await articleImages([...new Set(needLookup)]) : new Map<string, string>();

  const fileFor = (r: ArchiveRecord) => r.meta.imageFile ?? r.meta.artistImageFile ?? (article(r) ? byTitle.get(article(r)!) : undefined);
  const files = [...new Set(targets.map(fileFor).filter((f): f is string => !!f).map((f) => f.replace(/_/g, " ")))];
  const info = await commonsInfo(files);

  const out: Record<string, ArchiveImage> = {};
  for (const r of targets) {
    const file = fileFor(r)?.replace(/_/g, " ");
    const img = file ? info.get(file) : undefined;
    if (img) out[r.id] = { ...img, alt: r.category === "born" || r.category === "died" ? `Portrait of ${r.title}` : `Image related to ${r.title}` };
  }
  return out;
}

export interface ArticleContext {
  extract: string;
  url: string;
  title: string;
}

/** The linked article's lead, used on the deep-dive page, quoted as Wikipedia's and never reworded. */
export async function articleContext(title: string): Promise<ArticleContext | null> {
  const res = await fetchJson<{ query?: { pages: { title: string; extract?: string; missing?: boolean }[] } }>(
    `https://en.wikipedia.org/w/api.php?${qs({
      action: "query", prop: "extracts", exintro: 1, explaintext: 1, exsentences: 6, redirects: 1, format: "json", formatversion: 2, titles: title,
    })}`,
    { lane: "wikimedia" },
  );
  const page = res.query?.pages[0];
  if (!page?.extract) return null;
  return { extract: page.extract, title: page.title, url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, "_"))}` };
}
