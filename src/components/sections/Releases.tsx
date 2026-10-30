import { Poster, Sleeve } from "../Artwork";
import { SafeImage } from "../SafeImage";
import { Chapter, Empty, ProviderWarning, Sources, StoryLink } from "../ui";
import { getArchive } from "@/lib/archive";
import { films, music } from "@/lib/editorial";
import type { ArchiveRecord, ParsedDate, ProviderId } from "@/lib/types";

async function failed(date: ParsedDate, ids: ProviderId[]) {
  const { reports } = await getArchive(date);
  return reports.filter((r) => ids.includes(r.id) && r.state === "failed").map((r) => r.label);
}

export const MUSIC_META = { id: "music", sky: "sky-morning", number: "02", kicker: "Released", title: "Out in the world that day" };
export const FILM_META = { id: "film", sky: "sky-noon", number: "03", kicker: "At the cinema", title: "On the screen" };

export async function Music({ date }: { date: ParsedDate }) {
  const { records } = await getArchive(date);
  const items = music(records);
  return (
    <Chapter {...MUSIC_META} intro="Records, tours and concerts dated to this day. Songs count by release date, never chart date, and MusicBrainz double-checks where it holds an exact day. The cover art is our own, because label artwork isn’t licensed for reuse.">
      {items.length === 0 ? (
        <Empty>Wikidata and Wikipedia’s music pages hold no exact-day release for this date. Many releases are only dated to the month or year, so they can’t appear here.</Empty>
      ) : (
        <ul className="crate list-none p-0" tabIndex={0} aria-label="Music released this day, scrollable">
          {items.map((r) => (
            <li key={r.id} className="lift">
              <StoryLink record={r} className="block">
                <Sleeve title={r.title} artist={r.meta.artist} />
              </StoryLink>
              <p className="tag mt-2">{[r.meta.releaseType, r.meta.genres?.[0]].filter(Boolean).join(" · ") || "Music"}</p>
              {r.place && <p className="tag text-[var(--mut)]">{r.place}</p>}
              <div className="mt-1"><Sources record={r} /></div>
            </li>
          ))}
        </ul>
      )}
      <ProviderWarning names={await failed(date, ["wikidata", "wikipedia-annual", "musicbrainz"])} />
    </Chapter>
  );
}

function releaseLabel(r: ArchiveRecord): string {
  if (r.meaning === "premiered") return "Premiere";
  if (r.meta.releaseCountry) return `${r.meta.earliestRelease ? "First recorded release" : "Release"}: ${r.meta.releaseCountry}`;
  if (r.meta.earliestRelease) return "First recorded release, country not stated";
  return "Release, country not stated";
}

export async function Films({ date }: { date: ParsedDate }) {
  const { records } = await getArchive(date);
  const items = films(records);
  return (
    <Chapter {...FILM_META} intro="Films can open on different days in different countries, so each release shows where it applies.">
      {items.length === 0 ? (
        <Empty>Wikidata and TMDB, where configured, hold no film dated to this exact day.</Empty>
      ) : (
        <ul className="grid list-none grid-cols-2 gap-x-5 gap-y-9 p-0 md:grid-cols-3 lg:grid-cols-4">
          {items.slice(0, 16).map((r) => (
            <li key={r.id} className="lift">
              <StoryLink record={r} className="block">
                {r.image && r.image.height > r.image.width ? (
                  <SafeImage image={r.image} className="aspect-[2/3] w-full object-cover" fallback={<Poster title={r.title} line={r.meta.directors?.[0]} />} />
                ) : (
                  <Poster title={r.title} line={r.meta.directors?.[0]} />
                )}
              </StoryLink>
              <p className="tag mt-2 text-[var(--acc)]">{releaseLabel(r)}</p>
              {r.meta.directors?.[0] && <p className="mt-1 text-base leading-tight">Directed by {r.meta.directors.join(", ")}</p>}
              {r.meta.genres?.[0] && <p className="tag text-[var(--mut)]">{r.meta.genres.slice(0, 2).join(" · ")}</p>}
              <div className="mt-1"><Sources record={r} /></div>
            </li>
          ))}
        </ul>
      )}
    </Chapter>
  );
}
