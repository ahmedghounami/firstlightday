# Firstlight

Enter a date of birth and watch the biggest moments of that exact day as a full-screen story: goals, music, famous arrivals and departures, films and headlines. Moroccan moments appear in Arabic and English. The complete record for each date sits behind it at `/day/<date>/archive`.

No database, no accounts, no paid services and no AI-written content.

## Run it

Needs Node 20.9 or later.

```bash
npm install
cp .env.example .env.local   # optional; every key is optional
npm run dev                  # http://localhost:3000
```

Set `CONTACT_EMAIL` before deploying. Wikimedia and MusicBrainz ask for a contact in the User-Agent.

## Environment variables

| Variable | Required | Effect |
| --- | --- | --- |
| `CONTACT_EMAIL` | For production | Contact sent in the User-Agent |
| `NEXT_PUBLIC_SITE_URL` | For production | Canonical URLs, Open Graph and sitemap |
| `TMDB_API_KEY` | No | More film releases, and posters. Non-commercial licence |
| `GUARDIAN_API_KEY` | No | Reported headlines from 1999 |
| `OPENALEX_API_KEY` | No | Own daily budget for research papers |
| `NASA_API_KEY` | No | Turns on APOD, which returned placeholders when last tested |
| `THESPORTSDB_API_KEY` | No | Replaces the shared free key `123` |

## How it works

```
adapters (src/lib/sources) → merge and verify (pipeline.ts) → rank → images → sections
                 └── each cached per source and date (archive.ts)
```

- **Adapters** return normalised records and recheck the date themselves, whatever the query asked for.
- **Caching** uses Next's persistent data cache: 30 days per source and date, 1 day for dates under a month old. Failed sources are never cached, so a failure can't become a stored empty day, and they back off for 5 minutes in memory.
- **Streaming**: the date header renders at once, then chapters arrive as their sources respond. Each source fails on its own, and the page says which ones did.

The rules for what counts as verified are on `/method`.

## The story

`src/lib/moments.ts` chooses at most 12 moments. Fame is the number of Wikipedia languages covering a person or work (for songs, the artist), with a lower bar for Moroccans. `src/components/reel/` is the player. Moroccan records come from Wikidata (citizenship, country, origin) and from text mentions, with Arabic from Wikidata and Arabic Wikipedia.

## Checks

```bash
npm test                # unit tests
npm run typecheck
npm run lint
npm run build
npm run verify:dates    # live: what each source returns for the test dates
npm run start & npm run check:ui   # browser QA; screenshots go to qa-shots/
```

## Deploying to Vercel

Import the repo, set `CONTACT_EMAIL` and `NEXT_PUBLIC_SITE_URL`, and deploy. There's nothing else to provision.

Keep in mind:

- The function timeout must cover a cold date, about 20s here. The Hobby plan's default may be lower; raise `maxDuration` if chapters get cut off.
- Rate limits are per process. MusicBrainz allows one request a second per IP, and the lane in `src/lib/http.ts` only enforces that within one instance.
- Text from Wikipedia and TVmaze is CC BY-SA. Keep the attribution in the footer and on story pages.
