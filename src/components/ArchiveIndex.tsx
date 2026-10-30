"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Category, Region, Verification } from "@/lib/types";

export interface IndexItem {
  id: string;
  date: string;
  title: string;
  category: Category;
  label: string;
  region?: Region;
  place?: string;
  verification: Verification;
  score: number;
  hidden: boolean;
}

type Filter = "all" | "world" | "music" | "film" | "tv" | "sports" | "science" | "technology" | "culture" | "business" | "people" | "hidden";
type Sort = "significance" | "region" | "confidence";

const FILTERS: [Filter, string][] = [
  ["all", "All stories"], ["world", "World"], ["music", "Music"], ["film", "Movies"], ["tv", "Television"], ["sports", "Sports"],
  ["science", "Science"], ["technology", "Technology"], ["culture", "Culture"], ["business", "Business"], ["people", "People"], ["hidden", "Hidden stories"],
];

const CONFIDENCE: Record<Verification, number> = { corroborated: 0, sourced: 1, disputed: 2 };
const STEP = 24;

function matches(item: IndexItem, filter: Filter): boolean {
  if (filter === "all") return true;
  if (filter === "people") return item.category === "born" || item.category === "died";
  if (filter === "hidden") return item.hidden;
  return item.category === filter;
}

export function ArchiveIndex({ items }: { items: IndexItem[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [region, setRegion] = useState<string>("all");
  const [sort, setSort] = useState<Sort>("significance");
  const [shown, setShown] = useState(STEP);

  const regions = useMemo(() => [...new Set(items.map((i) => i.region).filter((r): r is Region => !!r))].sort(), [items]);
  const located = items.filter((i) => i.region).length;

  const visible = useMemo(() => {
    const list = items.filter((i) => matches(i, filter) && (region === "all" || i.region === region));
    if (sort === "region") return [...list].sort((a, b) => (a.region ?? "~").localeCompare(b.region ?? "~") || b.score - a.score);
    if (sort === "confidence") return [...list].sort((a, b) => CONFIDENCE[a.verification] - CONFIDENCE[b.verification] || b.score - a.score);
    return list;
  }, [items, filter, region, sort]);

  const counts = useMemo(() => Object.fromEntries(FILTERS.map(([f]) => [f, items.filter((i) => matches(i, f)).length])), [items]);

  return (
    <div>
      <div role="group" aria-label="Filter by subject" className="flex flex-wrap gap-2">
        {FILTERS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            disabled={counts[value] === 0}
            onClick={() => {
              setFilter(value);
              setShown(STEP);
            }}
            className={`tag min-h-11 cursor-pointer px-3 disabled:cursor-not-allowed disabled:opacity-40 ${filter === value ? "bg-[var(--ink)] text-[var(--bg)]" : "bg-[var(--raise)] text-[var(--ink)]"}`}
          >
            {label} <span className="opacity-70">{counts[value]}</span>
          </button>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3">
        <label className="tag flex items-center gap-2 text-[var(--mut)]">
          Region
          <select value={region} onChange={(e) => { setRegion(e.target.value); setShown(STEP); }} className="min-h-11 bg-[var(--raise)] px-2 text-[var(--ink)]">
            <option value="all">Worldwide</option>
            {regions.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
        <label className="tag flex items-center gap-2 text-[var(--mut)]">
          Sort
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="min-h-11 bg-[var(--raise)] px-2 text-[var(--ink)]">
            <option value="significance">Most significant</option>
            <option value="region">By region</option>
            <option value="confidence">By source confidence</option>
          </select>
        </label>
      </div>
      <p className="mt-3 text-base text-[var(--mut)]">
        {located} of {items.length} records have a known location, so region filters show only those. Our sources give days, not times, so there’s no hour-by-hour order.
      </p>

      <p className="tag mt-6 text-[var(--mut)]" aria-live="polite">{visible.length} {visible.length === 1 ? "record" : "records"}</p>

      {visible.length === 0 ? (
        <div className="rule-t rule-b mt-2 py-8">
          <p className="display text-[1.8rem] italic">No verified records match this view.</p>
          <p className="mt-1 text-[var(--mut)]">That doesn’t mean nothing happened, only that nothing with a location and an exact date reached our sources.</p>
          <button type="button" className="btn btn-ghost mt-4" onClick={() => { setFilter("all"); setRegion("all"); }}>Clear filters</button>
        </div>
      ) : (
        <ul className="rule-t mt-2 list-none p-0">
          {visible.slice(0, shown).map((item) => (
            <li key={item.id} className="rule-b grid grid-cols-[minmax(0,1fr)] gap-x-5 py-2.5 sm:grid-cols-[7.5rem_minmax(0,1fr)_9rem] sm:items-baseline">
              <span className="tag text-[var(--acc)]">{item.label}</span>
              <Link href={`/day/${item.date}/story/${encodeURIComponent(item.id)}`} className="text-[1.1rem] leading-snug no-underline hover:underline">{item.title}</Link>
              <span className="tag text-[var(--mut)] sm:text-right">{item.place ?? ""}</span>
            </li>
          ))}
        </ul>
      )}
      {shown < visible.length && (
        <button type="button" className="btn btn-ghost mt-6" onClick={() => setShown((s) => s + STEP)}>Show more</button>
      )}
    </div>
  );
}
