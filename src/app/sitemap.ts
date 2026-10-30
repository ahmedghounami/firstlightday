import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { toIso } from "@/lib/date";

export const revalidate = 86400;

/** Deliberately small: the last fifty years of today's date, refreshed daily. Empty dates also carry noindex. */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const month = now.getUTCMonth() + 1;
  const day = month === 2 && now.getUTCDate() === 29 ? 28 : now.getUTCDate();
  const dates = Array.from({ length: 50 }, (_, i) => toIso(now.getUTCFullYear() - 1 - i, month, day));
  return [{ url: SITE_URL }, { url: `${SITE_URL}/method` }, ...dates.map((d) => ({ url: `${SITE_URL}/day/${d}` }))];
}
