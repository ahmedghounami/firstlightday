import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Reel } from "@/components/reel/Reel";
import { Rings } from "@/components/Rings";
import { getMoments } from "@/lib/archive";
import { formatDate, parseIso, weekday } from "@/lib/date";
import { arabicDate } from "@/lib/moments";
import { SITE_URL } from "@/lib/site";
import type { ParsedDate } from "@/lib/types";

/** Below this a date has little to show, so it stays out of search engines. */
const MIN_MOMENTS_TO_INDEX = 3;

type Props = { params: Promise<{ date: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const parsed = parseIso((await params).date);
  if (!parsed.ok) return { title: "Date not found", robots: { index: false } };
  const date = parsed.date;
  const moments = await getMoments(date);
  const label = formatDate(date);
  const description = moments.length ? `${weekday(date)}, ${label}: ${moments.slice(0, 3).map((m) => m.title).join(" · ")}` : `The story of ${weekday(date)}, ${label}.`;
  return {
    title: label,
    description,
    alternates: { canonical: `/day/${date.iso}` },
    robots: { index: moments.length >= MIN_MOMENTS_TO_INDEX, follow: true },
    openGraph: { title: `${label} · Firstlight`, description, type: "article" },
    twitter: { card: "summary_large_image", title: `${label} · Firstlight`, description },
  };
}

function Loading({ date }: { date: ParsedDate }) {
  return (
    <div className="sky-night relative flex h-[100svh] flex-col justify-end overflow-hidden px-5 pb-16 sm:px-12">
      <Rings year={date.year} month={date.month} day={date.day} className="absolute top-1/2 right-[-22vmin] h-[120vmin] w-[120vmin] -translate-y-1/2 opacity-50" />
      <h1 className="display nums relative text-[clamp(3rem,9vw,6rem)]">{formatDate(date)}</h1>
      <p className="tag pulse-quiet relative mt-3 text-[var(--mut)]" aria-busy="true">Finding the biggest moments of this day…</p>
    </div>
  );
}

async function Story({ date }: { date: ParsedDate }) {
  const moments = await getMoments(date);
  const iso = date.iso;
  const label = formatDate(date);
  const data = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${label} · Firstlight`,
    url: `${SITE_URL}/day/${iso}`,
    mainEntity: { "@type": "ItemList", itemListElement: moments.map((m, i) => ({ "@type": "ListItem", position: i + 1, name: m.title })) },
  };
  return (
    <main id="main">
      <Reel
        date={date}
        label={label}
        weekday={weekday(date)}
        arDate={arabicDate(date)}
        moments={moments}
        coverage="Showing only the biggest names we can date exactly. National-team goals only: club goals aren’t in free sources."
      />
      <section className="sr-only" aria-label={`All moments of ${label}`}>
        <ol>
          {moments.map((m) => (
            <li key={m.id}>
              <Link href={`/day/${iso}/story/${encodeURIComponent(m.storyId)}`}>{m.title}</Link>
              {m.arTitle && <span lang="ar" dir="rtl"> {m.arTitle}</span>}
            </li>
          ))}
        </ol>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />
    </main>
  );
}

export default async function DayPage({ params }: Props) {
  const parsed = parseIso((await params).date);
  if (!parsed.ok) notFound();
  return <Suspense fallback={<Loading date={parsed.date} />}><Story date={parsed.date} /></Suspense>;
}
