import { ShareActions } from "../ShareActions";
import { DateEntry } from "../DateEntry";
import { getCore } from "@/lib/archive";
import { capsule } from "@/lib/editorial";
import { formatDate, weekday } from "@/lib/date";
import type { ParsedDate } from "@/lib/types";

export async function Capsule({ date }: { date: ParsedDate }) {
  const { records } = await getCore(date);
  const { lead, culture } = capsule(records);
  return (
    <section id="explore" className="anchor sky-night px-4 py-16 sm:px-8 sm:py-24 lg:pl-28" aria-labelledby="capsule-title">
      <div className="mx-auto grid max-w-[80rem] gap-12 lg:grid-cols-2">
        <div>
          <p className="tag text-[var(--acc)]">Time capsule</p>
          <h2 id="capsule-title" className="chapter-title mt-3">Keep this day.</h2>
          <figure className="sky-dawn mt-8 p-6 sm:p-8">
            <p className="tag text-[var(--acc)]">{weekday(date)}</p>
            <p className="display nums mt-2 text-[clamp(2.4rem,7vw,4rem)]">{formatDate(date)}</p>
            {lead && <p className="rule-t mt-5 pt-3 text-[1.25rem] leading-snug">{lead.title}</p>}
            {culture && <p className="rule-t mt-3 pt-3 text-base text-[var(--mut)]">{culture.category === "music" ? "Released" : "On screen"}: {culture.title}</p>}
            <p className="tag mt-5 text-[var(--mut)]">Firstlight</p>
          </figure>
          <ShareActions iso={date.iso} label={formatDate(date)} />
        </div>
        <div>
          <p className="tag text-[var(--acc)]">Explore</p>
          <h2 className="chapter-title mt-3">Open another day.</h2>
          <div className="mt-8 max-w-lg">
            <DateEntry initial={{ day: date.day, month: date.month, year: date.year }} submitLabel="Go to that day" compact />
          </div>
        </div>
      </div>
    </section>
  );
}
