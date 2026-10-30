import type { Adapter } from "../types";
import { footballGoals } from "./football-goals";
import { guardian } from "./guardian";
import { moroccoResults } from "./morocco-results";
import { nasaApod } from "./nasa-apod";
import { openalex } from "./openalex";
import { thesportsdb } from "./thesportsdb";
import { tmdb } from "./tmdb";
import { tvmaze } from "./tvmaze";
import { wikidata } from "./wikidata";
import { wikipediaAnnual } from "./wikipedia-annual";
import { wikipediaOnThisDay } from "./wikipedia-onthisday";
import { wikipediaPortal } from "./wikipedia-portal";

/** Open Wikimedia sources: these lead the page and arrive first. */
export const CORE_ADAPTERS: Adapter[] = [wikidata, wikipediaAnnual, wikipediaPortal, wikipediaOnThisDay, footballGoals, moroccoResults];
/** Specialist sources, each failing independently. */
export const EXTRA_ADAPTERS: Adapter[] = [tvmaze, thesportsdb, nasaApod, openalex, tmdb, guardian];
