import { Chapter, Empty, Sources, StoryLink } from "../ui";
import { Disclosure } from "../Disclosure";
import { getCore } from "@/lib/archive";
import { hiddenStories } from "@/lib/editorial";
import type { ParsedDate } from "@/lib/types";

export const HIDDEN_META = { id: "hidden", sky: "sky-twilight", number: "10", kicker: "The small print of history", title: "What the front page missed" };

export async function Hidden({ date }: { date: ParsedDate }) {
  const { records } = await getCore(date);
  const items = hiddenStories(records);
  return (
    <Chapter {...HIDDEN_META} intro="Dated entries from Wikipedia’s country and specialist year pages. Small stories, each still tied to this exact day.">
      {items.length === 0 ? (
        <Empty>We read 42 year-in-country and year-in-subject pages and none had another entry for this exact day.</Empty>
      ) : (
        <Disclosure initial={8} total={items.length} label="stories">
          {items.map((r) => (
            <li key={r.id} className="rule-b grid gap-x-6 py-4 sm:grid-cols-[9rem_minmax(0,1fr)]">
              <span className="tag text-[var(--acc)]">{r.place ?? "Worldwide"}</span>
              <div className="min-w-0">
                <p className="text-[1.2rem] leading-snug"><StoryLink record={r}>{r.summary || r.title}</StoryLink></p>
                <div className="mt-1"><Sources record={r} /></div>
              </div>
            </li>
          ))}
        </Disclosure>
      )}
    </Chapter>
  );
}
