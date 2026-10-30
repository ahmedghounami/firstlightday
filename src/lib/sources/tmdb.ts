import { fetchJson, qs } from "../http";
import type { Adapter, ArchiveRecord, ParsedDate } from "../types";
import { makeRecord } from "./record";

export interface Movie {
  id: number;
  title: string;
  overview?: string;
  release_date?: string;
  poster_path?: string | null;
  popularity?: number;
}

/** discover/movie filters on primary release date, which is TMDB's own choice of a film's main release. */
export function moviesToRecords(movies: Movie[], date: ParsedDate): ArchiveRecord[] {
  return movies
    .filter((m) => m.release_date === date.iso)
    .map((m) => {
      const url = `https://www.themoviedb.org/movie/${m.id}`;
      const record = makeRecord({
        id: `tmdb-${m.id}`,
        title: m.title,
        summary: m.overview ?? "",
        date,
        meaning: "released",
        category: "film",
        sitelinks: Math.min(20, Math.round((m.popularity ?? 0) / 2)),
        evidence: [{ provider: "tmdb", label: "TMDB", url, claimedDate: date.iso }],
      });
      if (m.poster_path) {
        record.image = {
          src: `https://image.tmdb.org/t/p/w342${m.poster_path}`,
          width: 342,
          height: 513,
          alt: `Poster for ${m.title}`,
          credit: "TMDB",
          license: "Used under TMDB API terms",
          pageUrl: url,
        };
      }
      return record;
    });
}

export const tmdb: Adapter = {
  id: "tmdb",
  label: "TMDB",
  unavailable: () => (process.env.TMDB_API_KEY ? null : { state: "unconfigured", note: "Set TMDB_API_KEY to add releases and posters." }),
  async fetch(date) {
    const res = await fetchJson<{ results: Movie[] }>(
      `https://api.themoviedb.org/3/discover/movie?${qs({
        api_key: process.env.TMDB_API_KEY,
        "primary_release_date.gte": date.iso,
        "primary_release_date.lte": date.iso,
        sort_by: "popularity.desc",
        include_adult: "false",
      })}`,
    );
    return moviesToRecords(res.results, date);
  },
};
