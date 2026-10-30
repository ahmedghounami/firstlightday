import { Chapter, Empty, ProviderWarning, Sources, StoryLink } from "../ui";
import { Disclosure } from "../Disclosure";
import { getArchive } from "@/lib/archive";
import { business, science, sports, television } from "@/lib/editorial";
import { SafeImage } from "../SafeImage";
import type { ArchiveRecord, ParsedDate } from "@/lib/types";

export const TV_META = { id: "tv", sky: "sky-afternoon", number: "04", kicker: "On air", title: "The listings" };
export const SPORTS_META = { id: "sports", sky: "sky-gold", number: "05", kicker: "Results", title: "The results" };
export const SCIENCE_META = { id: "science", sky: "sky-afternoon", number: "06", kicker: "Discoveries", title: "Launched, published, found" };
export const BUSINESS_META = { id: "business", sky: "sky-gold", number: "07", kicker: "Business", title: "On the ledger" };

function ListingRow({ r }: { r: ArchiveRecord }) {
  return (
    <li className="rule-b grid gap-x-5 py-3 sm:grid-cols-[9rem_minmax(0,1fr)_minmax(0,1fr)] sm:items-baseline">
      <span className="tag text-[var(--mut)]">{r.meta.network ?? r.place ?? "Television"}</span>
      <span className="display text-[1.45rem] leading-tight">
        <StoryLink record={r}>{r.title}</StoryLink>
        {r.meta.isPremiere && <span className="tag ml-2 text-[var(--acc)]">Premiere</span>}
      </span>
      <span className="text-base text-[var(--mut)]">{r.summary}</span>
    </li>
  );
}

export async function Television({ date }: { date: ParsedDate }) {
  const { records, reports } = await getArchive(date);
  const items = television(records).sort((a, b) => Number(!!b.meta.isPremiere) - Number(!!a.meta.isPremiere) || b.score - a.score);
  const down = reports.filter((r) => r.id === "tvmaze" && r.state === "failed").map((r) => r.label);
  return (
    <Chapter {...TV_META} intro="Episodes broadcast that day in the US, UK, Canada, Australia and Japan, plus series that began.">
      {items.length === 0 ? (
        <Empty>TVmaze and Wikidata list nothing dated to this day. TV listings are sparse before the 1990s.</Empty>
      ) : (
        <Disclosure initial={10} total={items.length} label="listings">
          {items.map((r, i) => (
            <ListingRow key={`${r.id}-${i}`} r={r} />
          ))}
        </Disclosure>
      )}
      <ProviderWarning names={down} />
    </Chapter>
  );
}

export async function Sports({ date }: { date: ParsedDate }) {
  const { records, reports } = await getArchive(date);
  const items = sports(records);
  const down = reports.filter((r) => r.id === "thesportsdb" && r.state === "failed").map((r) => r.label);
  return (
    <Chapter {...SPORTS_META} intro="Scores appear only where a source records them. The free sports feed returns a few matches per sport, so this is a sample of the day, not a full fixture list.">
      {items.length === 0 ? (
        <Empty>No match or competition is dated to this exact day in our sources.</Empty>
      ) : (
        <Disclosure initial={10} total={items.length} label="results">
          {items.map((r) => (
            <li key={r.id} className="rule-b grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 py-3">
              <div className="min-w-0">
                <p className="display text-[1.5rem] leading-tight"><StoryLink record={r}>{r.title}</StoryLink></p>
                <p className="tag mt-1 text-[var(--mut)]">{[r.meta.competition, r.meaning === "began" ? "Began this day" : null, r.place].filter(Boolean).join(" · ")}</p>
              </div>
              {r.meta.score && <span className="display nums text-[2.4rem] leading-none">{r.meta.score}</span>}
            </li>
          ))}
        </Disclosure>
      )}
      <ProviderWarning names={down} />
    </Chapter>
  );
}

export async function Science({ date }: { date: ParsedDate }) {
  const { records, reports } = await getArchive(date);
  const items = science(records);
  const papers = items.filter((r) => r.meta.citations !== undefined);
  const others = items.filter((r) => r.meta.citations === undefined);
  const down = reports.filter((r) => (r.id === "openalex" || r.id === "nasa-apod") && r.state === "failed").map((r) => r.label);
  return (
    <Chapter {...SCIENCE_META} intro="Launch, publication and founding dates are kept distinct. A paper’s date is when it was published, not when the work was done.">
      {items.length === 0 ? (
        <Empty>No launch, product or paper is dated to this exact day in our sources. Research papers are skipped on the 1st of a month and on 31 December, because those dates are often placeholders.</Empty>
      ) : (
        <div className="grid gap-10 lg:grid-cols-2">
          {others.length > 0 && (
            <ul className="rule-t list-none p-0">
              {others.slice(0, 10).map((r) => (
                <li key={r.id} className="rule-b py-4">
                  {r.image && r.meta.apodImage && <SafeImage image={r.image} className="mb-3 w-full" />}
                  <h3 className="display text-[1.6rem] leading-tight"><StoryLink record={r}>{r.title}</StoryLink></h3>
                  {r.summary && <p className="mt-1 text-[1.05rem] text-[var(--mut)]">{r.summary}</p>}
                  <div className="mt-1"><Sources record={r} /></div>
                </li>
              ))}
            </ul>
          )}
          {papers.length > 0 && (
            <div>
              <h3 className="tag text-[var(--acc)]">Published this day, by later citations</h3>
              <ol className="mt-3 list-none p-0">
                {papers.map((r) => (
                  <li key={r.id} className="rule-t grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3 py-3">
                    <span className="display nums text-[1.7rem] leading-none">{r.meta.citations!.toLocaleString("en-GB")}</span>
                    <div className="min-w-0">
                      <p className="text-[1.05rem] leading-snug"><StoryLink record={r}>{r.title}</StoryLink></p>
                      {r.meta.journal && <p className="tag mt-1 text-[var(--mut)]">{r.meta.journal}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
      <ProviderWarning names={down} />
    </Chapter>
  );
}

export async function Business({ date }: { date: ParsedDate }) {
  const { records } = await getArchive(date);
  const items = business(records);
  return (
    <Chapter {...BUSINESS_META} intro="Companies founded and business news dated to this day. There’s no free source for historical market data, so this chapter is the thinnest.">
      {items.length === 0 ? (
        <Empty>Nothing in our sources dates a company founding or business event to this exact day.</Empty>
      ) : (
        <ul className="rule-t list-none p-0">
          {items.slice(0, 12).map((r) => (
            <li key={r.id} className="rule-b grid gap-x-6 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-baseline">
              <span className="display text-[1.45rem] leading-tight"><StoryLink record={r}>{r.title}</StoryLink></span>
              <Sources record={r} />
            </li>
          ))}
        </ul>
      )}
    </Chapter>
  );
}
