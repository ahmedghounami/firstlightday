/* Live check against real providers: run with `npm run verify:dates`.
   Bypasses the cache and shows what each source returned for the test dates. */
process.env.FIRSTLIGHT_NO_CACHE = "1";
import { parseIso } from "../src/lib/date";
import { mergeRecords, rank } from "../src/lib/pipeline";
import { CORE_ADAPTERS, EXTRA_ADAPTERS } from "../src/lib/sources";
import { headlines } from "../src/lib/editorial";

const DATES = process.argv.slice(2).length ? process.argv.slice(2) : ["2002-08-17", "1999-12-31", "2010-01-01", "1985-07-13", "2000-02-29"];

async function main() {
  for (const iso of DATES) {
    const parsed = parseIso(iso);
    if (!parsed.ok) throw new Error(iso);
    const date = parsed.date;
    console.log(`\n===== ${iso}`);
    const all = [];
    for (const adapter of [...CORE_ADAPTERS, ...EXTRA_ADAPTERS]) {
      const blocked = adapter.unavailable?.(date);
      if (blocked) {
        console.log(`  ${adapter.id}: ${blocked.state}`);
        continue;
      }
      const started = Date.now();
      try {
        const records = await adapter.fetch(date);
        all.push(...records);
        console.log(`  ${adapter.id}: ${records.length} in ${Date.now() - started}ms`);
      } catch (e) {
        console.log(`  ${adapter.id}: FAILED ${e instanceof Error ? e.message : e}`);
      }
    }
    const bad = all.filter((r) => r.date !== iso || r.precision !== "day" || r.evidence.some((e) => e.claimedDate !== iso && e.provider !== "wikidata"));
    const ranked = rank(mergeRecords(all));
    const counts: Record<string, number> = {};
    for (const r of ranked) counts[r.category] = (counts[r.category] ?? 0) + 1;
    console.log(`  raw ${all.length} -> merged ${ranked.length}; wrong-date ${bad.length}; disputed ${ranked.filter((r) => r.verification === "disputed").length}`);
    console.log("  ", JSON.stringify(counts));
    for (const r of headlines(ranked, 6)) console.log(`   [${r.score}] ${r.category} ${r.verification}: ${r.title}`);
    for (const cat of ["music", "film", "sports", "born"] as const) {
      console.log(`   ${cat}: ${ranked.filter((r) => r.category === cat).slice(0, 4).map((r) => r.title).join(" | ")}`);
    }
  }
}
main();
