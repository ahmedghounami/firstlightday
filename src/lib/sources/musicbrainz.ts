import { fetchJson } from "../http";
import type { ArchiveRecord } from "../types";

interface ReleaseGroup {
  id: string;
  title: string;
  "first-release-date"?: string;
  "primary-type"?: string;
}

const MAX_LOOKUPS = 8;
/** The check is a bonus on top of a finished page, so it must never hold the page up for long. */
const BUDGET_MS = 10_000;

/** Applies a MusicBrainz first-release date to a record. Coarser dates neither confirm nor contradict. */
export function applyReleaseGroup(record: ArchiveRecord, group: ReleaseGroup): ArchiveRecord {
  const claimed = group["first-release-date"] ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(claimed)) return record;
  const evidence = {
    provider: "musicbrainz" as const,
    label: `MusicBrainz: ${group.title}`,
    url: `https://musicbrainz.org/release-group/${group.id}`,
    claimedDate: claimed,
    license: "CC0",
  };
  return {
    ...record,
    evidence: [...record.evidence, evidence],
    verification: claimed === record.date ? "corroborated" : "disputed",
    meta: { ...record.meta, releaseType: group["primary-type"] ?? record.meta.releaseType },
  };
}

/**
 * MusicBrainz search matches dates at year resolution, so it cannot discover a day's releases.
 * It is used as an independent second opinion on releases Wikidata names, at its limit of one request a second.
 */
export async function verifyWithMusicBrainz(records: ArchiveRecord[]): Promise<{ records: ArchiveRecord[]; checked: number; failed: boolean }> {
  // An event linked to a later recording (a concert and its DVD) has no release date to compare.
  const queue = records.filter((r) => r.category === "music" && r.meaning === "released" && r.meta.mbid).sort((a, b) => b.sitelinks - a.sitelinks).slice(0, MAX_LOOKUPS);
  const updates = new Map<string, ArchiveRecord>();
  let failed = false;
  const started = Date.now();
  for (const record of queue) {
    if (Date.now() - started > BUDGET_MS) break;
    try {
      const group = await fetchJson<ReleaseGroup>(`https://musicbrainz.org/ws/2/release-group/${record.meta.mbid}?fmt=json`, {
        lane: "musicbrainz",
        gapMs: 1100,
        retries: 0,
        timeoutMs: 4000,
      });
      updates.set(record.id, applyReleaseGroup(record, group));
    } catch {
      failed = true;
    }
  }
  return { records: records.map((r) => updates.get(r.id) ?? r), checked: updates.size, failed };
}
