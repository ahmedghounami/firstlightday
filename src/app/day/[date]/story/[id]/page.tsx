import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Credit, SafeImage } from "@/components/SafeImage";
import { Wordmark } from "@/components/Wordmark";
import { getArchive, getArticleContext } from "@/lib/archive";
import { CATEGORY_LABEL, extraSummary, MEANING_LABEL, VERIFICATION_LABEL, verificationNote } from "@/lib/editorial";
import { formatDate, parseIso } from "@/lib/date";

type Props = { params: Promise<{ date: string; id: string }> };

async function load(params: Props["params"]) {
  const { date: iso, id } = await params;
  const parsed = parseIso(iso);
  if (!parsed.ok) return null;
  const { records } = await getArchive(parsed.date);
  const record = records.find((r) => r.id === decodeURIComponent(id));
  return record ? { date: parsed.date, record } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = await load(params);
  if (!found) return { title: "Story not found", robots: { index: false } };
  return { title: found.record.title, description: found.record.summary || found.record.title, robots: { index: false, follow: true } };
}

const PARTS: [keyof import("@/lib/types").ScoreParts, string, number][] = [
  ["reach", "Reach across Wikipedia editions", 40],
  ["sources", "Independent sources", 20],
  ["international", "Listed in a main annual or daily record", 15],
  ["subject", "Subject weighting", 10],
  ["verification", "Date evidence", 15],
];

export default async function StoryPage({ params }: Props) {
  const found = await load(params);
  if (!found) notFound();
  const { date, record: r } = found;
  const context = r.wikiTitle ? await getArticleContext(r.wikiTitle, date) : null;
  const back = `/day/${date.iso}`;

  return (
    <main id="main" className="sky-dawn min-h-screen px-4 pb-20 sm:px-8">
      <header className="mx-auto flex h-20 max-w-5xl items-center justify-between">
        <Wordmark />
        <Link href={`${back}/archive`} className="tag link">← {formatDate(date)}</Link>
      </header>
      <article className="mx-auto mt-8 max-w-5xl">
        <p className="tag text-[var(--acc)]">{CATEGORY_LABEL[r.category]}{r.place ? ` · ${r.place}` : ""}</p>
        <h1 className="display mt-3 text-[clamp(2.4rem,6.5vw,5rem)]">{r.title}</h1>
        <p className="tag mt-4">{MEANING_LABEL[r.meaning]} on {formatDate(date)}</p>

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div>
            {r.image && (
              <figure className="m-0 mb-6">
                <SafeImage image={r.image} priority className="w-full" />
                <figcaption className="mt-2"><Credit image={r.image} /></figcaption>
              </figure>
            )}
            {extraSummary(r) && <p className="text-[1.35rem] leading-snug">{extraSummary(r)}</p>}
            {r.meta.artist && <p className="mt-3">Artist: {r.meta.artist}</p>}
            {r.meta.directors?.[0] && <p className="mt-3">Directed by {r.meta.directors.join(", ")}</p>}
            {r.meta.score && <p className="mt-3">Result: {r.meta.score}{r.meta.competition ? `, ${r.meta.competition}` : ""}</p>}
            {context && (
              <section className="rule-t mt-8 pt-5" aria-labelledby="context-title">
                <h2 id="context-title" className="display text-[1.9rem]">Context</h2>
                <p className="tag mt-1 text-[var(--mut)]">From the Wikipedia article “{context.title}”, CC BY-SA 4.0. It may cover more than this day.</p>
                {context.extract.split("\n").filter(Boolean).map((p, i) => <p key={i} className="mt-3">{p}</p>)}
                <a className="link mt-3 inline-block" href={context.url} rel="noreferrer">Read the full article</a>
              </section>
            )}
          </div>
          <aside className="space-y-8">
            <section aria-labelledby="evidence-title">
              <h2 id="evidence-title" className="display text-[1.9rem]">Evidence</h2>
              <p className="tag mt-1 text-[var(--acc)]">{VERIFICATION_LABEL[r.verification]}</p>
              <p className="mt-1 text-base text-[var(--mut)]">{verificationNote(r)}</p>
              <ul className="mt-3 list-none p-0">
                {r.evidence.map((e) => (
                  <li key={`${e.url}${e.claimedDate}`} className="rule-t py-2 text-base">
                    <a className="link" href={e.url} rel="noreferrer">{e.label}</a>
                    <span className="tag block text-[var(--mut)]">States {e.claimedDate}{e.license ? ` · ${e.license}` : ""}</span>
                    {e.citedUrl && <a className="tag link block break-all text-[var(--mut)]" href={e.citedUrl} rel="noreferrer">Its citation</a>}
                  </li>
                ))}
              </ul>
            </section>
            <section aria-labelledby="rank-title">
              <h2 id="rank-title" className="display text-[1.9rem]">Why it ranks here</h2>
              <dl className="mt-2">
                {PARTS.map(([key, label, max]) => (
                  <div key={key} className="rule-t flex items-baseline justify-between gap-4 py-1.5 text-base">
                    <dt>{label}</dt>
                    <dd className="tag nums m-0 whitespace-nowrap">{r.scoreParts[key]} / {max}</dd>
                  </div>
                ))}
                <div className="rule-t flex justify-between py-1.5">
                  <dt className="font-medium">Score</dt>
                  <dd className="tag nums m-0">{r.score} / 100</dd>
                </div>
              </dl>
            </section>
          </aside>
        </div>
      </article>
    </main>
  );
}
