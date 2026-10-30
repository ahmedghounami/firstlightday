import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Capsule } from "@/components/sections/Capsule";
import { DayHero } from "@/components/sections/DayHero";
import { Coverage, Everything, INDEX_META, OTHER_META, OtherYears } from "@/components/sections/Everything";
import { Headlines, HEADLINES_META } from "@/components/sections/Headlines";
import { Hidden, HIDDEN_META } from "@/components/sections/Hidden";
import { BORN_META, Born, DIED_META, Died } from "@/components/sections/People";
import { Films, FILM_META, Music, MUSIC_META } from "@/components/sections/Releases";
import { BUSINESS_META, Business, SCIENCE_META, Science, Sports, SPORTS_META, Television, TV_META } from "@/components/sections/Broadcast";
import { Footer } from "@/components/Footer";
import { SunRail } from "@/components/SunRail";
import { Chapter, SectionLoading } from "@/components/ui";
import { getCore } from "@/lib/archive";
import { headlines } from "@/lib/editorial";
import { formatDate, parseIso, weekday } from "@/lib/date";
import { SITE_URL } from "@/lib/site";

type Props = { params: Promise<{ date: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const parsed = parseIso((await params).date);
  if (!parsed.ok) return { title: "Date not found", robots: { index: false } };
  const date = parsed.date;
  const { records } = await getCore(date);
  const lead = headlines(records, 1)[0];
  const label = formatDate(date);
  const description = lead ? `${weekday(date)}, ${label}: ${lead.title}. The headlines, releases and moments we can trace to this day.` : `The record of ${weekday(date)}, ${label}.`;
  return {
    title: `${label}: the full record`,
    description,
    alternates: { canonical: `/day/${date.iso}/archive` },
    robots: { index: false, follow: true },
    openGraph: { title: `${label} · Firstlight`, description, type: "article" },
    twitter: { card: "summary_large_image", title: `${label} · Firstlight`, description },
  };
}

function Slot({ meta, label, children }: { meta: Omit<Parameters<typeof Chapter>[0], "children">; label: string; children: React.ReactNode }) {
  return <Suspense fallback={<Chapter {...meta}><SectionLoading label={label} /></Chapter>}>{children}</Suspense>;
}

async function JsonLd({ iso, label }: { iso: string; label: string }) {
  const parsed = parseIso(iso);
  if (!parsed.ok) return null;
  const { records } = await getCore(parsed.date);
  const data = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${label} · Firstlight`,
    url: `${SITE_URL}/day/${iso}`,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: headlines(records, 5).map((r, i) => ({ "@type": "ListItem", position: i + 1, name: r.title, url: `${SITE_URL}/day/${iso}/story/${encodeURIComponent(r.id)}` })),
    },
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export default async function DayPage({ params }: Props) {
  const parsed = parseIso((await params).date);
  if (!parsed.ok) notFound();
  const date = parsed.date;

  return (
    <>
      <DayHero date={date} />
      <SunRail />
      <main id="main">
        <Slot meta={HEADLINES_META} label="Wikipedia and Wikidata"><Headlines date={date} /></Slot>
        <Slot meta={MUSIC_META} label="music releases"><Music date={date} /></Slot>
        <Slot meta={FILM_META} label="film releases"><Films date={date} /></Slot>
        <Slot meta={TV_META} label="TV listings"><Television date={date} /></Slot>
        <Slot meta={SPORTS_META} label="sports results"><Sports date={date} /></Slot>
        <Slot meta={SCIENCE_META} label="launches and research"><Science date={date} /></Slot>
        <Slot meta={BUSINESS_META} label="business records"><Business date={date} /></Slot>
        <Slot meta={BORN_META} label="births"><Born date={date} /></Slot>
        <Slot meta={DIED_META} label="deaths"><Died date={date} /></Slot>
        <Slot meta={HIDDEN_META} label="regional pages"><Hidden date={date} /></Slot>
        <Slot meta={INDEX_META} label="the whole archive"><Everything date={date} /></Slot>
        <Slot meta={OTHER_META} label="other years"><OtherYears date={date} /></Slot>
        <Suspense fallback={null}><Coverage date={date} /></Suspense>
        <Suspense fallback={null}><Capsule date={date} /></Suspense>
      </main>
      <Footer />
      <Suspense fallback={null}><JsonLd iso={date.iso} label={formatDate(date)} /></Suspense>
    </>
  );
}
