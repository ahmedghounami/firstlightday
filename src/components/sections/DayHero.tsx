import Link from "next/link";
import { Suspense } from "react";
import { Rings } from "../Rings";
import { Wordmark } from "../Wordmark";
import { dayOfYear, daysSince, monthName, shiftDays, weekday } from "@/lib/date";
import { getCore } from "@/lib/archive";
import { introduction } from "@/lib/editorial";
import { moonPhase } from "@/lib/moon";
import type { ParsedDate } from "@/lib/types";

function Moon({ fraction }: { fraction: number }) {
  // Terminator as an ellipse: its width and side follow the phase.
  const waxing = fraction < 0.5;
  const k = Math.cos(2 * Math.PI * fraction);
  const rx = Math.abs(k) * 16;
  const d = `M20 4 A16 16 0 0 ${waxing ? 1 : 0} 20 36 A${rx} 16 0 0 ${(waxing ? k > 0 : k < 0) ? 0 : 1} 20 4 Z`;
  return (
    <svg viewBox="0 0 40 40" className="h-10 w-10" aria-hidden="true">
      <circle cx="20" cy="20" r="16" fill="var(--raise)" stroke="var(--rule)" />
      <path d={d} fill="var(--ink)" />
    </svg>
  );
}

async function Intro({ date }: { date: ParsedDate }) {
  const { records, reports } = await getCore(date);
  const live = reports.filter((r) => r.state === "ok").length;
  return <p className="develop mt-6 max-w-xl text-[1.3rem] leading-snug">{introduction(date, records, live)}</p>;
}

export function DayHero({ date }: { date: ParsedDate }) {
  const moon = moonPhase(date);
  const ago = daysSince(date);
  const prev = shiftDays(date, -1);
  const next = shiftDays(date, 1);
  return (
    <section className="sky-night relative overflow-hidden lg:pl-28">
      <div className="absolute inset-x-0 bottom-0 h-3/4" style={{ background: "radial-gradient(80% 100% at 70% 100%, rgb(245 166 91 / .2), transparent 72%)" }} aria-hidden="true" />
      <header className="relative z-10 mx-auto flex h-20 max-w-[80rem] items-center justify-between px-4 sm:px-8 lg:px-0">
        <Wordmark />
        <Link href={`/day/${date.iso}`} className="tag link">Watch the story</Link>
      </header>
      <div className="relative mx-auto grid max-w-[80rem] items-end gap-8 px-4 pt-6 pb-14 sm:px-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:px-0 lg:pb-20">
        <div className="relative z-10">
          <p className="tag text-[var(--acc)]">{weekday(date)}</p>
          <h1 className="display nums mt-3">
            <span className="block text-[clamp(2.75rem,8.5vw,6.5rem)] italic">{date.day} {monthName(date)}</span>
            <span className="block text-[clamp(6.5rem,23vw,17rem)] leading-[0.86]">{date.year}</span>
          </h1>
          <Suspense fallback={<p className="tag pulse-quiet mt-8 text-[var(--mut)]">Searching the record for this date…</p>}>
            <Intro date={date} />
          </Suspense>
        </div>
        <div className="absolute top-2 right-[-30vw] w-[80vw] opacity-40 sm:right-[-12vw] sm:w-[56vw] lg:relative lg:top-0 lg:right-0 lg:w-full lg:opacity-100">
          <Rings year={date.year} month={date.month} day={date.day} className="w-full" />
        </div>
      </div>
      <dl className="rule-t relative mx-auto grid max-w-[80rem] grid-cols-2 gap-x-6 gap-y-4 px-4 py-6 sm:px-8 md:grid-cols-4 lg:px-0">
        <div>
          <dt className="tag text-[var(--mut)]">Day of the year</dt>
          <dd className="display nums m-0 mt-1 text-3xl">{dayOfYear(date)}</dd>
        </div>
        <div>
          <dt className="tag text-[var(--mut)]">Days ago</dt>
          <dd className="display nums m-0 mt-1 text-3xl">{ago.toLocaleString("en-GB")}</dd>
        </div>
        <div>
          <dt className="tag text-[var(--mut)]">The moon, estimated</dt>
          <dd className="m-0 mt-1 flex items-center gap-2 text-lg leading-tight"><Moon fraction={moon.fraction} />{moon.name}</dd>
        </div>
        <div>
          <dt className="tag text-[var(--mut)]">Neighbouring days</dt>
          <dd className="m-0 mt-1 flex flex-col text-lg leading-tight">
            <Link className="link" href={`/day/${prev}/archive`}>← {prev}</Link>
            {ago > 0 && <Link className="link" href={`/day/${next}/archive`}>{next} →</Link>}
          </dd>
        </div>
      </dl>
    </section>
  );
}
