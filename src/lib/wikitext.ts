/** Turning wikitext into plain text. Fails closed: if a template we can't read remains, the line is dropped,
 *  because dropping a template silently can remove a number or a name from a factual sentence. */

const DROPPABLE = /^(?:cite|citation|sfn|efn|refn|harv|rp|citation needed|cn|better source|when|who|update|dead link|failed verification|flag|flagicon|flagcountry|flagu|flag icon|small|anchor|clear|main|see also|further|portal|wikt|commons|use |short description|as of\b|·|dot|\*)/i;

function expandTemplate(body: string): string | null {
  const parts = body.split("|").map((p) => p.trim());
  const name = (parts[0] ?? "").toLowerCase().trim();
  const args = parts.slice(1).filter((p) => !/^[a-z_-]+=/i.test(p));

  if (name === "convert" || name === "cvt") {
    const [value, unit, third] = args;
    if (!value || !unit) return null;
    const rangeWords = new Set(["to", "and", "-", "–", "or"]);
    if (third && rangeWords.has(third)) return `${value} ${third} ${args[3] ?? ""} ${args[4] ?? ""}`.replace(/\s+/g, " ").trim();
    return `${value} ${unit}`;
  }
  if (["nowrap", "nobr", "nowraplinks", "lang-en", "transl"].includes(name)) return args[args.length - 1] ?? "";
  if (name === "lang" || name === "langx") return args[1] ?? "";
  if (name === "ill" || name === "interlanguage link") return args[0] ?? "";
  if (name === "sortname") return `${args[0] ?? ""} ${args[1] ?? ""}`.trim();
  if (["nbsp", "snd", "spaced ndash", "spaced en dash", "ndash", "mdash", "en dash", "em dash", "–", "—"].includes(name)) {
    return name === "nbsp" ? " " : name === "mdash" || name === "em dash" || name === "—" ? " — " : " – ";
  }
  if (name === "ushr" || name === "usc" || name === "ship" || name === "uss" || name === "hms") return args.join(" ");
  if (name === "inflation" || name.startsWith("us$") || name === "usd" || name === "gbp" || name === "eur" || name === "currency") return null;
  if (DROPPABLE.test(name)) return "";
  return null;
}

/** Removes references and returns the first cited URL and whether any reference existed. */
export function stripRefs(text: string): { text: string; citedUrl?: string; hasReference: boolean } {
  let citedUrl: string | undefined;
  let hasReference = false;
  const take = (block: string) => {
    hasReference = true;
    if (citedUrl) return;
    const m = /\|\s*url\s*=\s*(https?:[^\s|}]+)/i.exec(block) ?? /\[?(https?:\/\/[^\s\]|}<]+)/.exec(block);
    if (m) citedUrl = m[1];
  };
  const out = text
    .replace(/<ref\b[^>/]*\/>/gi, () => {
      hasReference = true;
      return "";
    })
    .replace(/<ref\b[^>]*>[\s\S]*?<\/ref>/gi, (block) => {
      take(block);
      return "";
    })
    // The Current Events portal cites inline as ([url Publisher]).
    .replace(/\(\s*\[https?:\/\/[^\]]*\](?:\s*,?\s*\[https?:\/\/[^\]]*\])*\s*\)/g, (block) => {
      take(block);
      return "";
    });
  return { text: out, citedUrl, hasReference };
}

export function firstLink(text: string): string | undefined {
  const m = /\[\[([^\]|#]+)/.exec(text);
  if (!m || /^(file|image|category):/i.test(m[1]!)) return undefined;
  return m[1]!.trim();
}

export function plainText(raw: string): string | null {
  let text = raw;
  // Innermost templates first, so nested ones expand.
  for (let i = 0; i < 6 && text.includes("{{"); i++) {
    let failed = false;
    text = text.replace(/\{\{([^{}]*)\}\}/g, (_, body: string) => {
      const expanded = expandTemplate(body);
      if (expanded === null) failed = true;
      return expanded ?? "";
    });
    if (failed) return null;
  }
  if (text.includes("{{") || text.includes("}}")) return null;

  text = text
    .replace(/\[\[(?:file|image|category):[^\]]*\]\]/gi, "")
    .replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g, "$1")
    .replace(/\[\[([^\]]*)\]\]/g, "$1")
    .replace(/\[https?:\/\/\S+\s+([^\]]*)\]/g, "$1")
    .replace(/\[https?:\/\/\S+\]/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/'{2,}/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/\(\s*\)/g, "")
    .trim();
  if (/[[\]{}|]/.test(text)) return null;
  return text;
}

export function wikiUrl(title: string): string {
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_")).replace(/%3A/g, ":").replace(/%2F/g, "/")}`;
}

const ABBREVIATION = /(?:^|[\s(])(?:[A-Z]|St|Mt|Mr|Mrs|Ms|Dr|Jr|Sr|Lt|Col|Gen|Sen|Rep|Gov|Sgt|Capt|Prof|Rev|Inc|Ltd|Co|No|vs|ft|mi|km|U\.S|D\.C)$/;

/** Ends at a real full stop: not at the "H." of George H. W. Bush or the "St." of St. Louis. */
function firstSentence(text: string): string {
  const stops = /[.!?](?=\s+[A-Z0-9“"])/g;
  for (let m = stops.exec(text); m; m = stops.exec(text)) {
    if (!ABBREVIATION.test(text.slice(0, m.index))) return text.slice(0, m.index + 1);
  }
  return text;
}

/** A headline from the source sentence, using its own words. A leading topic ("2002 floods: ...") is dropped,
 *  and long sentences are kept whole up to a limit, because a cut clause can leave a fragment that says nothing. */
export function headline(text: string, max = 170): string {
  const sentence = firstSentence(text).replace(/\.$/, "").trim();
  const topic = /^[^:]{3,48}:\s+(?=[A-Z])/.exec(sentence);
  const body = topic ? sentence.slice(topic[0].length) : sentence;
  if (body.length <= max) return body;
  return `${body.slice(0, body.lastIndexOf(" ", max))}…`;
}
