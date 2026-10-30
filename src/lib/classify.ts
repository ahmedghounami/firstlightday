import type { Category, DateMeaning } from "./types";

export interface Classification {
  category: Category;
  meaning: DateMeaning;
  hidden?: boolean;
}

type Rule = [RegExp, Category, DateMeaning?];

const SKIP = /\b(calendar day|calendar date|day of the year|wikimedia|scholarly article|gene|protein|star\b|galaxy|asteroid|taxon|road|street|human settlement|village|commune|municipality|administrative|cemetery|census|family name|given name|painting|hospital|university|school|museum|library|legal case|court case|statute|act of|government circular|parliamentary session|legislative term|cabinet|deputy|position|exhibit)\b/i;

/** Matched against an item's "instance of" labels and description. Order matters: specific before general. */
const RULES: Rule[] = [
  [/\b(television (series|season|program|programme|film|episode|special)|tv series|web series|anime television|reality (television|show)|sitcom|soap opera|miniseries|talk show|game show)/i, "tv"],
  [/\b(film festival|film award|academy awards?)\b/i, "film"],
  [/\b(short film|feature film|animated film|documentary film|film|motion picture)\b/i, "film"],
  [/\b(album|single|extended play|\bep\b|soundtrack|song|musical work|music video|mixtape|remix)\b/i, "music"],
  [/\b(music festival|concert tour|concert|grammy|musical group|rock band|band|duo|girl group|boy band)\b/i, "music"],
  [/\b(association football match|football match|sports? (season|competition|event)|sporting event|tournament|championship|grand prix|olympic|world cup|marathon|race|boxing match|cricket|tennis|league|cup final|super bowl|match|paralympic|rally|games|wrestling|professional wrestling)\b/i, "sports"],
  [/\b(spacecraft|satellite|space (mission|probe|shuttle|launch|flight)|crewed spaceflight|rocket launch|lunar|mars)\b/i, "science", "launched"],
  [/\b(video game|software|operating system|programming language|web ?site|web browser|computer|smartphone|mobile phone|consumer electronics|aircraft model|aircraft family|electric vehicle|automobile model|car model|technical standard)\b/i, "technology"],
  [/\b(scientific|discovery|medical|vaccine|pandemic|epidemic|expedition)\b/i, "science"],
  [/\b(business|company|enterprise|corporation|airline|bank|startup|public company|stock exchange|retail|merger|acquisition)\b/i, "business", "founded"],
  [/\b(literary work|novel|book|poem|play|opera|ballet|musical|theatrical|comic|manga|exhibition|magazine|newspaper|periodical|short story)\b/i, "culture"],
  [/\b(election|referendum|treaty|summit|war|battle|conflict|coup|protest|riot|revolution|assassination|attack|bombing|massacre|shooting|terror|earthquake|flood|hurricane|typhoon|cyclone|tsunami|eruption|disaster|accident|crash|shipwreck|sinking|derailment|explosion|fire|strike|demonstration|inauguration|state funeral|diplomatic|peace|ceasefire|military operation|hijacking|kidnapping|crime|trial)\b/i, "world"],
];

const WORLD_DEFAULT = /\b(historical event|event|occurrence|incident)\b/i;

export function classifyEntity(types: string[], description: string, property: string): Classification | null {
  const haystack = [...types, description].join(" ; ");
  if (SKIP.test(types.join(" ; "))) return null;

  for (const [re, category, fixed] of RULES) {
    if (!re.test(haystack)) continue;
    // "Inception" is meaningful for companies and bands; for institutions it is usually a nominal start date.
    if (property === "P571" && category !== "business" && category !== "music") return null;
    return { category, meaning: fixed ?? meaningFor(property, category) };
  }
  if (WORLD_DEFAULT.test(haystack)) return { category: "world", meaning: meaningFor(property, "world"), hidden: true };
  return null;
}

function meaningFor(property: string, category: Category): DateMeaning {
  switch (property) {
    case "P619":
      return "launched";
    case "P1619":
      return "opened";
    case "P1191":
      return "premiered";
    case "P606":
      return "launched";
    case "P571":
      return "founded";
    case "P577":
      if (category === "tv") return "premiered";
      if (category === "culture" || category === "science") return "published";
      return "released";
    case "P580":
      return category === "tv" ? "premiered" : "began";
    default:
      return "occurred";
  }
}

const KEYWORD_RULES: [RegExp, Category][] = [
  [/\b(football|soccer|cricket|rugby|tennis|olympic|grand prix|marathon|world cup|premier league|nba|nfl|baseball|basketball|boxing|wins? the|golf|cycling|athletics)\b/i, "sports"],
  [/\b(album|single|band|singer|concert|music festival|musician)\b/i, "music"],
  [/\b(film|movie|cinema|box office|premieres? at)\b/i, "film"],
  [/\b(television|tv series|broadcast|bbc one|itv|channel 4|episode)\b/i, "tv"],
  [/\b(space|nasa|satellite|spacecraft|astronom|scientists?|researchers?|genome|vaccine|discover(y|ed))\b/i, "science"],
  [/\b(software|internet|computer|microsoft|apple inc|google|technology)\b/i, "technology"],
  [/\b(shares|stock|bank|merger|acquire|acquisition|bankrupt|company|economy|inflation|currency|chief executive)\b/i, "business"],
  [/\b(museum|exhibition|novel|author|theatre|opera|painting|art gallery|festival|literary)\b/i, "culture"],
];

/** A coarse topic for free-text lines from country pages. Falls back to world news. */
export function classifyText(text: string): Category {
  for (const [re, category] of KEYWORD_RULES) if (re.test(text)) return category;
  return "world";
}
