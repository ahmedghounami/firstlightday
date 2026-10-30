import { Chapter, Empty, Sources, StoryLink } from "../ui";
import { Credit, SafeImage } from "../SafeImage";
import { getCore } from "@/lib/archive";
import { extraSummary, headlines } from "@/lib/editorial";
import type { ParsedDate } from "@/lib/types";

export const HEADLINES_META = { id: "headlines", sky: "sky-dawn", number: "01", kicker: "Front page", title: "What the record shows first" };

export async function Headlines({ date }: { date: ParsedDate }) {
  const { records } = await getCore(date);
  const [lead, ...rest] = headlines(records);
  return (
    <Chapter {...HEADLINES_META} intro="Ranked by reach, evidence and subject. The ranking is shown on every story.">
      {!lead ? (
        <Empty>We searched Wikipedia’s year, country and current-events pages and Wikidata. Dated coverage thins out in earlier decades.</Empty>
      ) : (
        <>
          <article className="develop grid gap-8 lg:grid-cols-12">
            {lead.image && (
              <figure className="image-zoom m-0 overflow-hidden lg:col-span-7">
                <SafeImage image={lead.image} priority sizes="(min-width:1024px) 58vw, 100vw" className="max-h-[34rem] w-full object-cover" />
                <figcaption className="mt-2"><Credit image={lead.image} /></figcaption>
              </figure>
            )}
            <div className={lead.image ? "lg:col-span-5" : "lg:col-span-10"}>
              <p className="tag text-[var(--acc)]">{lead.place ?? "Lead story"}</p>
              <h3 className="display mt-3 text-[clamp(2.1rem,5.5vw,4rem)]"><StoryLink record={lead}>{lead.title}</StoryLink></h3>
              {extraSummary(lead) && <p className="mt-4 text-[1.3rem] leading-snug">{extraSummary(lead)}</p>}
              <div className="mt-4"><Sources record={lead} /></div>
            </div>
          </article>
          {rest.length > 0 && (
            <ul className="rule-t mt-12 grid gap-x-10 pt-2 md:grid-cols-2 lg:grid-cols-3">
              {rest.map((r) => (
                <li key={r.id} className="rise rule-b py-5">
                  <h3 className="display text-[1.7rem] leading-[1.08]"><StoryLink record={r}>{r.title}</StoryLink></h3>
                  {r.place && <p className="tag mt-2 text-[var(--acc)]">{r.place}</p>}
                  <div className="mt-2"><Sources record={r} /></div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Chapter>
  );
}
