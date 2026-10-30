import Link from "next/link";
import { MEANING_LABEL, VERIFICATION_LABEL } from "@/lib/editorial";
import type { ArchiveRecord } from "@/lib/types";

export const storyHref = (r: Pick<ArchiveRecord, "id" | "date">) => `/day/${r.date}/story/${encodeURIComponent(r.id)}`;

export function Chapter({
  id,
  sky,
  number,
  kicker,
  title,
  intro,
  children,
}: {
  id: string;
  sky: string;
  number: string;
  kicker: string;
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={`anchor ${sky} px-4 py-16 sm:px-8 sm:py-24 lg:pl-28`} data-chapter={id}>
      <div className="mx-auto max-w-[80rem]">
        <header className="mb-10 max-w-4xl">
          <p className="tag nums text-[var(--acc)]">{number} · {kicker}</p>
          <h2 id={`${id}-title`} className="chapter-title mt-3">{title}</h2>
          {intro && <p className="mt-4 max-w-2xl text-[var(--mut)]">{intro}</p>}
        </header>
        {children}
      </div>
    </section>
  );
}

export function Sources({ record }: { record: ArchiveRecord }) {
  const cited = record.evidence.find((e) => e.citedUrl)?.citedUrl;
  const first = record.evidence[0];
  return (
    <p className="tag text-[var(--mut)]">
      <span className="text-[var(--ink)]">{MEANING_LABEL[record.meaning]}</span>
      {" · "}
      {first && <a href={first.url} rel="noreferrer" className="link">{first.label.replace(/^Wikipedia: /, "Wikipedia · ")}</a>}
      {record.evidence.length > 1 && ` +${record.evidence.length - 1}`}
      {cited && (
        <>
          {" · "}
          <a href={cited} rel="noreferrer" className="link">Cited source</a>
        </>
      )}
      {" · "}
      {VERIFICATION_LABEL[record.verification]}
    </p>
  );
}

export function StoryLink({ record, children, className }: { record: ArchiveRecord; children: React.ReactNode; className?: string }) {
  return (
    <Link href={storyHref(record)} className={`no-underline hover:underline decoration-1 underline-offset-4 ${className ?? ""}`}>
      {children}
    </Link>
  );
}

/** An honest empty chapter. Says what was searched, and never pads the page. */
export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rule-t rule-b max-w-2xl py-8">
      <p className="display text-[1.8rem] italic">Nothing traced to this exact day.</p>
      <p className="mt-2 text-[var(--mut)]">{children}</p>
    </div>
  );
}

export function SectionLoading({ label }: { label: string }) {
  return (
    <div aria-busy="true" className="rule-t rule-b py-8">
      <p className="tag pulse-quiet text-[var(--mut)]">Searching {label}…</p>
      <div className="mt-5 grid gap-3" aria-hidden="true">
        {[92, 76, 84].map((w) => (
          <div key={w} className="h-3 bg-[var(--raise)]" style={{ width: `${w}%` }} />
        ))}
      </div>
    </div>
  );
}

/** Used when a source that feeds a chapter failed, so a gap is never mistaken for an empty day. */
export function ProviderWarning({ names }: { names: string[] }) {
  if (!names.length) return null;
  return (
    <p className="tag mt-6 text-[var(--mut)]" role="status">
      {names.join(" and ")} did not respond, so this chapter may be incomplete. It will fill in on a later visit.
    </p>
  );
}
