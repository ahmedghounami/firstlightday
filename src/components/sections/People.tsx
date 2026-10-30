import { Chapter, Empty, StoryLink } from "../ui";
import { Credit, SafeImage } from "../SafeImage";
import { getCore } from "@/lib/archive";
import { born, died } from "@/lib/editorial";
import type { ArchiveRecord, ParsedDate } from "@/lib/types";

export const BORN_META = { id: "born", sky: "sky-sunset", number: "08", kicker: "Same birthday", title: "Arrived the same day" };
export const DIED_META = { id: "died", sky: "sky-dusk", number: "09", kicker: "In memory", title: "Those who left" };

const initials = (name: string) => name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("");

function Person({ r }: { r: ArchiveRecord }) {
  return (
    <li className="min-w-0">
      <div className="aspect-[4/5] overflow-hidden bg-[var(--raise)]">
        {r.image ? (
          <SafeImage image={r.image} className="h-full w-full object-cover object-top" fallback={<span className="display flex h-full items-center justify-center text-5xl text-[var(--mut)]" aria-hidden="true">{initials(r.title)}</span>} />
        ) : (
          <span className="display flex h-full items-center justify-center text-5xl text-[var(--mut)]" aria-hidden="true">{initials(r.title)}</span>
        )}
      </div>
      <h3 className="display mt-2 text-[1.4rem] leading-tight [overflow-wrap:anywhere]"><StoryLink record={r}>{r.title}</StoryLink></h3>
      {r.meta.occupation && <p className="text-base leading-tight">{r.meta.occupation}</p>}
      {r.image && <div className="mt-1 max-w-full truncate"><Credit image={r.image} /></div>}
    </li>
  );
}

export async function Born({ date }: { date: ParsedDate }) {
  const { records } = await getCore(date);
  const items = born(records);
  return (
    <Chapter {...BORN_META} intro="People with this exact birth date, year included, ordered by how many Wikipedia editions cover them.">
      {items.length === 0 ? (
        <Empty>Nobody in Wikidata with an exact birth date on this day meets our notability threshold. People born recently are often not yet covered.</Empty>
      ) : (
        <ul className="grid list-none grid-cols-2 gap-x-4 gap-y-8 p-0 sm:grid-cols-3 lg:grid-cols-6">
          {items.slice(0, 18).map((r) => <Person key={r.id} r={r} />)}
        </ul>
      )}
    </Chapter>
  );
}

export async function Died({ date }: { date: ParsedDate }) {
  const { records } = await getCore(date);
  const items = died(records);
  return (
    <Chapter {...DIED_META} intro="Notable people who died on this exact day.">
      {items.length === 0 ? (
        <Empty>No death in Wikidata is dated to this exact day at our notability threshold.</Empty>
      ) : (
        <ul className="rule-t grid list-none gap-x-10 p-0 md:grid-cols-2">
          {items.slice(0, 20).map((r) => (
            <li key={r.id} className="rule-b py-3">
              <p className="display text-[1.5rem] leading-tight">
                <StoryLink record={r}>{r.title}</StoryLink>
                {r.meta.ageAtDeath !== undefined && <span className="ml-2 font-body text-lg text-[var(--mut)]">aged {r.meta.ageAtDeath}</span>}
              </p>
              {r.meta.occupation && <p className="text-base text-[var(--mut)]">{r.meta.occupation}</p>}
            </li>
          ))}
        </ul>
      )}
    </Chapter>
  );
}

