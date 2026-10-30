"use client";

import { useCallback, useState } from "react";
import { DateEntry, type DraftDate } from "./DateEntry";
import { Rings } from "./Rings";

export function HomeHero() {
  const [draft, setDraft] = useState<DraftDate>({});
  const onChange = useCallback((d: DraftDate) => setDraft(d), []);
  const complete = draft.day && draft.month && draft.year;

  return (
    <div className="relative mx-auto grid min-h-[calc(100svh-5rem)] max-w-[88rem] items-center gap-8 px-4 pt-4 pb-12 sm:px-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div className="relative z-10 max-w-2xl">
        <h1 className="display text-[clamp(2.9rem,6.2vw,5.6rem)]">
          Somewhere, the sun was already up. <em className="text-[var(--acc)]">Then you arrived.</em>
        </h1>
        <p className="mt-4 max-w-lg text-[1.25rem] leading-snug text-[var(--mut)]">
          Enter your birthday and watch the biggest moments of that day: the goals, the music, the stars.
        </p>
        <div className="mt-5 max-w-lg">
          <DateEntry onChange={onChange} />
        </div>
      </div>

      <div className="pointer-events-none absolute top-[-6vw] right-[-34vw] w-[92vw] opacity-45 sm:right-[-20vw] sm:w-[70vw] lg:relative lg:top-0 lg:right-0 lg:w-full lg:opacity-100" aria-hidden="true">
        <div className="relative aspect-square">
          <div className="dawn-sweep absolute inset-[1%]" />
          <Rings {...(draft.year ? { year: draft.year } : {})} {...(draft.month ? { month: draft.month } : {})} {...(complete ? { day: draft.day } : {})} className="absolute inset-0 h-full w-full" />
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {complete ? "Date entered. Press Open that day to continue." : ""}
      </p>
    </div>
  );
}
