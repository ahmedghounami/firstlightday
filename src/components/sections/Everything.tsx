import { ArchiveIndex, type IndexItem } from "../ArchiveIndex";
import { Chapter, Empty } from "../ui";
import { getArchive, getOtherYears } from "@/lib/archive";
import { CATEGORY_LABEL, confirmed, verificationNote } from "@/lib/editorial";
import type { ParsedDate } from "@/lib/types";

export const INDEX_META = { id: "index", sky: "sky-night", number: "11", kicker: "The whole archive", title: "Everything we found" };
export const OTHER_META = { id: "other-years", sky: "sky-predawn", number: "12", kicker: "Not your year", title: "The same date, other years" };

export async function Everything({ date }: { date: ParsedDate }) {
  const { records } = await getArchive(date);
  const items: IndexItem[] = confirmed(records).map((r) => ({
    id: r.id, date: r.date, title: r.title, category: r.category, label: CATEGORY_LABEL[r.category], region: r.region, place: r.place,
    verification: r.verification, score: r.score, hidden: r.hidden,
  }));
  return (
    <Chapter {...INDEX_META} intro="Every confirmed record for this date, in one list you can filter.">
      {items.length === 0 ? <Empty>No verified records for this date yet.</Empty> : <ArchiveIndex items={items} />}
    </Chapter>
  );
}

export async function OtherYears({ date }: { date: ParsedDate }) {
  const events = await getOtherYears(date);
  return (
    <Chapter {...OTHER_META} intro={`These did not happen on your date. They happened on ${date.day}/${date.month} in other years, and each shows its own year.`}>
      {events.length === 0 ? (
        <Empty>Wikipedia’s On This Day feed could not be reached.</Empty>
      ) : (
        <ol className="rule-t grid list-none gap-x-10 p-0 md:grid-cols-2">
          {events.slice(0, 16).map((e) => (
            <li key={e.id} className="rule-b grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3 py-3">
              <span className="display nums text-[2.2rem] leading-none text-[var(--acc)]">{e.year}</span>
              <a href={e.url} rel="noreferrer" className="text-[1.05rem] leading-snug no-underline hover:underline">{e.text}</a>
            </li>
          ))}
        </ol>
      )}
    </Chapter>
  );
}

export async function Coverage({ date }: { date: ParsedDate }) {
  const { records, reports } = await getArchive(date);
  const disputed = records.filter((r) => r.verification === "disputed");
  const STATE = { ok: "Found", empty: "Nothing for this date", failed: "Did not respond", unconfigured: "Not switched on", "out-of-range": "Outside its coverage" } as const;
  return (
    <section className="sky-predawn px-4 pb-16 sm:px-8 lg:pl-28" aria-labelledby="coverage-title">
      <div className="mx-auto max-w-[80rem]">
        <h2 id="coverage-title" className="display text-[2.2rem]">How complete is this page?</h2>
        <p className="mt-2 max-w-2xl text-[var(--mut)]">Not complete, and it couldn’t be. This is what these sources hold at day precision. Plenty happened that was never recorded with an exact date.</p>
        {disputed.length > 0 && (
          <div className="mt-6">
            <h3 className="tag text-[var(--acc)]">Left out because sources disagree on the day</h3>
            <ul className="mt-2 list-none p-0">
              {disputed.map((r) => <li key={r.id} className="text-[1.05rem]"><a className="link" href={r.evidence[0]?.url} rel="noreferrer">{r.title}</a> <span className="text-[var(--mut)]">{verificationNote(r)}</span></li>)}
            </ul>
          </div>
        )}
        <table className="tag mt-6 w-full max-w-3xl border-collapse text-left">
          <caption className="sr-only">Status of each source for this date</caption>
          <thead className="sr-only"><tr><th>Source</th><th>Status</th><th>Records</th></tr></thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id} className="rule-t">
                <td className="py-2 pr-3 font-normal normal-case">{r.label}</td>
                <td className="py-2 pr-3 text-[var(--mut)]">{r.note && r.state !== "failed" ? r.note : STATE[r.state]}</td>
                <td className="nums py-2 text-right">{r.count || ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
