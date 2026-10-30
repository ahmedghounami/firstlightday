import { fetchJson, qs } from "../http";
import type { Adapter, ArchiveRecord, ParsedDate } from "../types";
import { makeRecord } from "./record";

export interface Apod {
  date: string;
  title: string;
  explanation?: string;
  url?: string;
  hdurl?: string;
  media_type: string;
  copyright?: string;
}

const PLACEHOLDER_TITLE = /^NASA Science$/i;
const PLACEHOLDER_TEXT = /^Discover the cosmos! Each day a different image/i;

const pageUrl = (d: ParsedDate) =>
  `https://apod.nasa.gov/apod/ap${String(d.year).slice(2)}${String(d.month).padStart(2, "0")}${String(d.day).padStart(2, "0")}.html`;

/** The API now answers some old dates with a generic NASA placeholder; those are not that day's picture. */
export function apodToRecord(a: Apod, date: ParsedDate): ArchiveRecord | null {
  if (a.date !== date.iso || PLACEHOLDER_TITLE.test(a.title) || a.url?.includes("nasa-logo")) return null;
  const text = a.explanation && !PLACEHOLDER_TEXT.test(a.explanation) ? a.explanation : "";
  const record = makeRecord({
    id: "apod",
    title: a.title.trim(),
    summary: text.split(/(?<=[.!?])\s+/).slice(0, 2).join(" "),
    date,
    meaning: "published",
    category: "science",
    sitelinks: 3,
    meta: { apodImage: true, publisher: "NASA Astronomy Picture of the Day" },
    evidence: [{ provider: "nasa-apod", label: "NASA APOD", url: pageUrl(date), claimedDate: date.iso, hasReference: true, license: a.copyright ? `© ${a.copyright.trim()}` : "NASA, public domain" }],
  });
  // Pictures credited to a photographer stay theirs, so only uncredited NASA images are displayed.
  if (a.media_type === "image" && a.url && !a.copyright) {
    record.image = {
      src: a.url.replace(/^http:/, "https:"),
      width: 960,
      height: 640,
      alt: a.title.trim(),
      credit: "NASA",
      license: "Public domain",
      pageUrl: pageUrl(date),
    };
  }
  return record;
}

export const nasaApod: Adapter = {
  id: "nasa-apod",
  label: "NASA Astronomy Picture of the Day",
  unavailable: (d) => {
    if (d.iso < "1995-06-16") return { state: "out-of-range", note: "APOD began on 16 June 1995." };
    // The shared DEMO_KEY is slow and the API was serving placeholders when tested, so it must be opted into.
    return process.env.NASA_API_KEY ? null : { state: "unconfigured", note: "Set NASA_API_KEY to try NASA's picture of the day." };
  },
  async fetch(date) {
    const a = await fetchJson<Apod>(`https://api.nasa.gov/planetary/apod?${qs({ date: date.iso, api_key: process.env.NASA_API_KEY })}`, { retries: 0, timeoutMs: 6000 });
    const record = apodToRecord(a, date);
    return record ? [record] : [];
  },
};
