import Link from "next/link";
import { HomeHero } from "@/components/HomeHero";
import { Footer } from "@/components/Footer";
import { Rings } from "@/components/Rings";
import { Wordmark } from "@/components/Wordmark";
import { formatDate, parseIso } from "@/lib/date";

const MOMENTS = [
  ["The goals", "Messi, Ronaldo, Pelé and more, if they scored on your day."],
  ["The music", "Big artists’ new songs, with the real clip when there is one."],
  ["The stars", "The famous people who arrived or left that day."],
  ["The screen", "The films people went to see."],
  ["The headlines", "The few stories the whole world talked about."],
  ["Morocco, in Arabic", "Moroccan names and moments, shown in Arabic and English."],
] as const;

const SAMPLES = ["1985-07-13", "1999-12-31", "2000-02-29", "2002-08-17", "2010-01-01"];

export default function Home() {
  return (
    <>
      <main id="main">
        <section className="sky-night relative overflow-hidden">
          <div className="absolute inset-x-0 bottom-0 h-[55%]" style={{ background: "radial-gradient(90% 100% at 75% 100%, rgb(245 166 91 / .13), transparent 70%)" }} aria-hidden="true" />
          <header className="relative z-20 mx-auto flex h-20 max-w-[88rem] items-center justify-between px-4 sm:px-8">
            <Wordmark />
            <Link href="/method" className="tag link">How it works</Link>
          </header>
          <HomeHero />
        </section>

        <section className="sky-dawn px-4 py-20 sm:px-8 sm:py-28">
          <div className="mx-auto max-w-[88rem]">
            <p className="tag text-[var(--acc)]">Less reading, more watching</p>
            <h2 className="chapter-title mt-3 max-w-4xl">Your day, in about a minute.</h2>
            <ul className="mt-10 grid list-none gap-x-10 gap-y-6 p-0 md:grid-cols-2 lg:grid-cols-3">
              {MOMENTS.map(([name, text]) => (
                <li key={name} className="rule-t pt-3">
                  <h3 className="display text-[1.9rem]">{name}</h3>
                  <p className="mt-1 text-[var(--mut)]">{text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="sky-twilight px-4 py-20 sm:px-8 sm:py-28">
          <div className="mx-auto max-w-[88rem]">
            <h2 className="chapter-title max-w-4xl">Traced, not guessed.</h2>
            <div className="mt-10 grid gap-8 md:grid-cols-3">
              {[
                ["The exact day or nothing", "“August 2002” is not 17 August 2002. If a source only knows the month or the year, the record stays out."],
                ["Your year stays your year", "Events from the same date in other years sit in their own section, each with its year printed large."],
                ["Every claim shows its source", "Each record links to its evidence. When sources disagree on the day, we say so instead of choosing one."],
              ].map(([title, text]) => (
                <div key={title} className="rule-t pt-4">
                  <h3 className="display text-[1.8rem]">{title}</h3>
                  <p className="mt-2 text-[var(--mut)]">{text}</p>
                </div>
              ))}
            </div>
            <p className="tag mt-16 text-[var(--mut)]">Or open a day from the record</p>
            <ul className="mt-5 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
              {SAMPLES.map((iso) => {
                const parsed = parseIso(iso);
                if (!parsed.ok) return null;
                const d = parsed.date;
                return (
                  <li key={iso}>
                    <Link href={`/day/${iso}`} className="group block no-underline">
                      <Rings year={d.year} month={d.month} day={d.day} dense={false} className="lift w-full max-w-44" />
                      <span className="mt-2 block text-lg group-hover:underline">{formatDate(d)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
