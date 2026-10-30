import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Wordmark } from "@/components/Wordmark";

export const metadata: Metadata = { title: "How we verify a date", description: "The sources behind Firstlight, how a date is checked and what we can’t cover." };

const SOURCES: [string, string, string][] = [
  ["Wikidata", "Births, deaths, films, albums, launches, founding dates, events", "Only day-precision statements in the Gregorian calendar. Coverage depends on what volunteers have entered."],
  ["Wikipedia year and country pages", "Dated events, including regional stories", "We read 42 pages per year. Entries on date ranges are left out. Coverage is strongest in English-language countries."],
  ["Wikipedia Current Events portal", "Daily reports", "Dense from about 2002 and missing for many earlier days."],
  ["Wikipedia On This Day", "Selected events and same-date history", "Only entries matching your exact year enter your archive."],
  ["Wikipedia goal lists", "International goals by 20 great players", "National-team goals only. Free sources don’t list club goals by date, so a Barcelona goal won’t appear."],
  ["Morocco results pages", "Every national-team match, with Moroccan scorers", "Men’s senior team. Scorers are missing for some older matches."],
  ["MusicBrainz", "A second check on release dates", "Its search can’t find releases by day, so it confirms what Wikidata finds rather than discovering new ones."],
  ["TVmaze", "Episodes broadcast", "US, UK, Canada, Australia and Japan. Sparse before the 1990s."],
  ["TheSportsDB (free tier)", "Match results", "Football, basketball and motorsport. Returns only a few matches per sport per day, so this is a sample. The free key is shared, and we found no published terms on commercial use."],
  ["OpenAlex", "Highly cited papers", "Publication dates on the 1st of a month and on 31 December are ignored as likely placeholders. Without a key it shares a small daily budget."],
  ["TMDB (optional)", "Film releases and posters", "Needs a key, and its licence covers non-commercial use only."],
  ["The Guardian (optional)", "Reported headlines from 1999", "Needs a free developer key."],
  ["NASA APOD (optional)", "Picture of the day from 1995", "Needs a key. It was returning placeholders when we built this, which we discard."],
];

export default function MethodPage() {
  return (
    <>
    <main id="main" className="sky-dawn px-4 pb-20 sm:px-8">
      <header className="mx-auto flex h-20 max-w-4xl items-center"><Wordmark /></header>
      <article className="mx-auto mt-8 max-w-4xl">
        <h1 className="display text-[clamp(2.75rem,8vw,5.5rem)]">How we verify a date.</h1>
        <p className="mt-6 text-[1.3rem] leading-snug">Firstlight shows what its sources can place on an exact day. It’s a record of what was written down with a date, not of everything that happened.</p>
        <h2 className="display mt-12 text-[2.2rem]">The rules</h2>
        <ul className="mt-3 space-y-2 pl-5">
          <li>A record needs a date stated to the day. A month or a year is not enough.</li>
          <li>Each record says what its date means: released, premiered, broadcast, published, founded, born or died.</li>
          <li>Other years stay in their own section, each with its year shown.</li>
          <li>When sources name different days, the record is marked disputed and left out of the main chapters. Regional film release dates aren’t treated as a dispute.</li>
          <li><strong>Corroborated</strong> means two independent datasets agree, or the source cites a reference. Wikipedia’s pages count as one source between them. <strong>Single source</strong> means one source gave the day with no reference we could follow.</li>
          <li>Nothing is written by AI. Summaries are the sources’ own words, and the day’s introduction only states counts and the calendar.</li>
          <li>The story keeps only famous names, measured by how many Wikipedia languages cover them. Moroccans are judged against a lower bar so that national stars aren’t lost.</li>
          <li>Arabic comes from Wikidata and Arabic Wikipedia. Without an Arabic source, the title stays in English rather than being machine-translated.</li>
          <li>Text containing a template we can’t read is dropped, not guessed at.</li>
          <li>Images need licence metadata. Album sleeves and film posters aren’t free to reuse, so we draw our own unless TMDB is configured.</li>
        </ul>
        <h2 className="display mt-12 text-[2.2rem]">How stories are ranked</h2>
        <p className="mt-3">Each story scores out of 100: reach across Wikipedia editions (40), independent sources (20), appearing in a main annual or daily record (15), subject (10) and date evidence (15). Reach isn’t importance, and the sum is a rough guide. Every story page shows its numbers.</p>
        <h2 className="display mt-12 text-[2.2rem]">Sources and limits</h2>
        <dl className="mt-4">
          {SOURCES.map(([name, gives, limit]) => (
            <div key={name} className="rule-t py-3">
              <dt className="display text-[1.5rem]">{name}</dt>
              <dd className="m-0">{gives}. <span className="text-[var(--mut)]">{limit}</span></dd>
            </div>
          ))}
        </dl>
        <h2 className="display mt-12 text-[2.2rem]">Privacy</h2>
        <p className="mt-3">There are no accounts, cookies or analytics, and we don’t store the dates you enter. The date is part of the page address, so it can appear in ordinary server logs at your host. When a story plays a music video or trailer, it loads from YouTube’s privacy-enhanced domain; slides without video contact only Wikimedia for pictures.</p>
      </article>
    </main>
    <Footer />
    </>
  );
}
