import Link from "next/link";
import { Wordmark } from "./Wordmark";

export function Footer() {
  const tmdb = !!process.env.TMDB_API_KEY;
  return (
    <footer className="sky-night rule-t px-4 py-14 sm:px-8">
      <div className="mx-auto grid max-w-[88rem] gap-8 md:grid-cols-[1fr_2fr]">
        <div className="space-y-3">
          <Wordmark />
          <p className="max-w-xs text-base text-[var(--mut)]">The stories, releases and moments we can trace back to a single day.</p>
        </div>
        <div className="space-y-3 text-[0.95rem] text-[var(--mut)]">
          <p>
            Text from <a className="link" href="https://www.wikipedia.org/" rel="noreferrer">Wikipedia</a> is used under{" "}
            <a className="link" href="https://creativecommons.org/licenses/by-sa/4.0/" rel="noreferrer">CC BY-SA 4.0</a>. TV listings from{" "}
            <a className="link" href="https://www.tvmaze.com/" rel="noreferrer">TVmaze</a> (CC BY-SA 4.0). Structured data from{" "}
            <a className="link" href="https://www.wikidata.org/" rel="noreferrer">Wikidata</a> and{" "}
            <a className="link" href="https://musicbrainz.org/" rel="noreferrer">MusicBrainz</a> (CC0).
            {tmdb && " This product uses TMDB and the TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB."}
          </p>
          <p>
            No accounts and no tracking. A date you look up is only part of the page address. <Link className="link" href="/method">How we verify a date</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
