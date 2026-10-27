const BOILERPLATE =
  /\b(cookie\s*policy|privacy\s*policy|terms\s*of\s*use|sign\s*up|subscribe\s*now|click\s*here\s*to|read\s*more\s*at|all\s*rights\s*reserved|follow\s*us\s*on|download\s*the\s*app)\b/i;

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  ndash: "–",
  mdash: "—",
  lsquo: "'",
  rsquo: "'",
  ldquo: '"',
  rdquo: '"',
  hellip: "…",
  nbsp: " ",
};

export function decodeEntities(input: string): string {
  let text = input;
  text = text.replace(/<![CDATA[(.*?)]]>/gi, "$1");
  text = text.replace(/&([a-zA-Z][a-zA-Z0-9]*);/g, (_, name) => NAMED_ENTITIES[name] ?? `&${name};`);
  text = text.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
  text = text.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  text = text.replace(/&([a-zA-Z][a-zA-Z0-9]*);/g, (_, name) => NAMED_ENTITIES[name] ?? `&${name};`);
  return text;
}

export function stripHtml(input: string): string {
  return input
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function cleanSummary(input: string | null | undefined, maxLength = 220): string | null {
  if (!input) return null;
  let text = stripHtml(decodeEntities(input));
  text = text.replace(/^\s*[^a-zA-Z0-9]*\s*/, "");
  text = text.replace(/^[“"']?[^a-zA-Z0-9]*\s*/, "");
  if (BOILERPLATE.test(text)) return null;
  if (text.length < 40) return null;

  if (text.length <= maxLength) return text;

  const slice = text.slice(0, maxLength);
  const lastSentenceEnd = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("! "), slice.lastIndexOf("? "));
  if (lastSentenceEnd > maxLength * 0.6) {
    return slice.slice(0, lastSentenceEnd + 1);
  }
  const lastSpace = slice.lastIndexOf(" ");
  if (lastSpace > maxLength * 0.7) {
    return slice.slice(0, lastSpace) + "…";
  }
  return slice + "…";
}

export function readingTime(text: string | null | undefined): number {
  if (!text) return 1;
  const words = stripHtml(decodeEntities(text)).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

const TAG_PATTERNS = [
  { label: "S&P 500", pattern: /\bs&p\s*500\b/i },
  { label: "Nasdaq", pattern: /\bnasdaq\b/i },
  { label: "Dow", pattern: /\bdow\s*(jones)?\b/i },
  { label: "Federal Reserve", pattern: /\b(federal reserve|the fed)\b/i },
  { label: "AI", pattern: /\b(ai|artificial intelligence)\b/i },
  { label: "Apple", pattern: /\bapple\b/i },
  { label: "Microsoft", pattern: /\bmicrosoft\b/i },
  { label: "Google", pattern: /\bgoogle\b/i },
  { label: "Amazon", pattern: /\bamazon\b/i },
  { label: "Tesla", pattern: /\btesla\b/i },
  { label: "Nvidia", pattern: /\bnvidia\b/i },
  { label: "Meta", pattern: /\bmeta\b/i },
  { label: "Bitcoin", pattern: /\bbitcoin\b/i },
  { label: "Crypto", pattern: /\b(crypto|cryptocurrency)\b/i },
  { label: "IPO", pattern: /\bipo\b/i },
  { label: "Earnings", pattern: /\bearnings\b/i },
  { label: "Tariffs", pattern: /\btariff\b/i },
  { label: "Inflation", pattern: /\binflation\b/i },
  { label: "Jobs", pattern: /\b(jobs report|unemployment|payrolls)\b/i },
  { label: "Oil", pattern: /\b(oil|crude)\b/i },
  { label: "Gold", pattern: /\bgold\b/i },
  { label: "Startups", pattern: /\bstartup\b/i },
  { label: "M&A", pattern: /\b(acquisition|acquires|merger|buyout)\b/i },
];

export function extractTags(title: string, summary?: string | null): string[] {
  const text = `${title} ${summary ?? ""}`;
  const tags = new Set<string>();
  for (const { label, pattern } of TAG_PATTERNS) {
    if (pattern.test(text)) tags.add(label);
  }
  return Array.from(tags).slice(0, 5);
}

/** Swap exotic spaces and hyphens (e.g. U+202F in "$100 billion") for plain ones so search can match them. */
export function normalizeText<T extends string | null | undefined>(input: T): T {
  if (!input) return input;
  return input.replace(/[\u00a0\u2007\u2009\u202f\u200b]/g, " ").replace(/[\u2010\u2011]/g, "-") as T;
}
