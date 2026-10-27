// Server-only: turns scraped wire stories into original, fact-checked US Business
// Forum articles with an illustration and an audio narration.
//
// Pipeline per story: draft -> fact-check -> similarity check -> image -> audio -> publish.
// Stories that cannot pass the fact-check or the similarity check are parked as
// "held" and never shown to readers.
import { Mp3Encoder } from "@breezystack/lamejs";
import jpeg from "jpeg-js";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { normalizeText } from "@/lib/text";

const SITE_AUTHOR = "US Business Forum Newsroom";
const IMAGE_MODEL = "google/gemini-nano-banana-2.1";
const VOICE_MODEL = "heygen/heygen-voice-1-turbo:free";
const VOICE = "nadine";
const TTS_CHUNK_CHARS = 2400;
const MAX_ATTEMPTS = 3;
// Share of the draft's 7-word runs that may also appear in the source.
const MAX_OVERLAP = 0.12;

type Source = {
  slug: string;
  title: string;
  summary: string | null;
  content: string | null;
  source_name: string | null;
  source_url: string | null;
  category: string;
  published_at: string;
};

class OffTopicError extends Error {}

type Draft = {
  off_topic?: boolean;
  headline: string;
  summary: string;
  seo_title: string;
  seo_description: string;
  body: string;
  tags: string[];
  image_prompt: string;
  image_alt: string;
};

export type GenerationResult = {
  considered: number;
  published: string[];
  held: { source: string; reason: string }[];
  skipped?: string;
};

function env(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

function textConfig() {
  const region = env("AWS_REGION") ?? "ap-south-1";
  return {
    baseUrl: (env("OPENAI_BASE_URL") ?? `https://bedrock-mantle.${region}.api.aws/v1`).replace(/\/$/, ""),
    key: env("OPENAI_API_KEY") ?? env("AWS_BEARER_TOKEN_BEDROCK"),
    model: env("TEXT_MODEL") ?? "openai.gpt-oss-120b",
  };
}

async function retryingFetch(url: string, init: RequestInit, timeoutMs: number, tries = 3): Promise<Response> {
  let last: unknown;
  for (let i = 0; i < tries; i += 1) {
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
      if (res.status !== 429 && res.status < 500) return res;
      last = new Error(`HTTP ${res.status}`);
    } catch (error) {
      last = error;
    }
    await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
  }
  throw last instanceof Error ? last : new Error(String(last));
}

async function askModel(prompt: string): Promise<string> {
  const { baseUrl, key, model } = textConfig();
  if (!key) throw new Error("Missing OPENAI_API_KEY / AWS_BEARER_TOKEN_BEDROCK");
  const res = await retryingFetch(
    `${baseUrl}/responses`,
    {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, input: [{ role: "user", content: prompt }], max_output_tokens: 6000 }),
    },
    90_000,
  );
  const json = (await res.json()) as {
    output_text?: string;
    output?: { type: string; content?: { text?: string }[] }[];
    error?: { message?: string };
  };
  if (!res.ok) throw new Error(`Text model ${res.status}: ${json.error?.message ?? "request failed"}`);
  if (typeof json.output_text === "string") return json.output_text;
  return (json.output ?? [])
    .filter((o) => o.type === "message")
    .flatMap((o) => (o.content ?? []).map((c) => c.text ?? ""))
    .join("");
}

/** Asks the model for a JSON object, retrying when it returns something unparseable. */
async function askJson<T>(prompt: string, tries = 3): Promise<T> {
  let last: unknown;
  for (let i = 0; i < tries; i += 1) {
    try {
      return parseJson<T>(await askModel(prompt));
    } catch (error) {
      last = error;
    }
  }
  throw last instanceof Error ? last : new Error(String(last));
}

function parseJson<T>(raw: string): T {
  const cleaned = raw.replace(/```(?:json)?/gi, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Model did not return JSON");
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/** Share of the draft's 7-word runs that also occur verbatim in the source. */
export function overlapRatio(draft: string, source: string): number {
  const n = 7;
  const d = words(draft);
  if (d.length < n) return 0;
  const grams = new Set<string>();
  const s = words(source);
  for (let i = 0; i <= s.length - n; i += 1) grams.add(s.slice(i, i + n).join(" "));
  let hit = 0;
  const total = d.length - n + 1;
  for (let i = 0; i < total; i += 1) if (grams.has(d.slice(i, i + n).join(" "))) hit += 1;
  return hit / total;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

function shortHash(value: string): string {
  let h = 5381;
  for (let i = 0; i < value.length; i += 1) h = ((h << 5) + h + value.charCodeAt(i)) >>> 0;
  return h.toString(36).slice(0, 6);
}

function draftPrompt(src: Source, feedback: string[]): string {
  const fix = feedback.length
    ? `\n\nYour previous draft was rejected. Fix these problems:\n- ${feedback.join("\n- ")}\n`
    : "";
  return `You are a senior editor at US Business Forum, a U.S. business news site. Write an ORIGINAL news article based ONLY on the facts in the SOURCE below.

Rules:
- Use only facts, names, titles, dates and figures that appear in the SOURCE. Never add or guess anything.
- Do NOT copy sentences or phrases and do NOT follow the SOURCE's paragraph order. Write in your own words and your own structure: lead with the most important development, then context, then implications.
- Quote at most one short phrase (under 12 words) and only if it appears in the SOURCE.
- Name the original publisher ("${src.source_name ?? "the publisher"}") in the first two paragraphs as the origin of the reporting.
- Tone: confident, clear, neutral, written for busy U.S. business readers. No hype, no clickbait, no first person.
- 300 to 420 words in 5 to 7 short paragraphs, separated by blank lines. End with one paragraph that begins "**Why it matters:**" and explains the significance in 1 or 2 sentences using only the SOURCE's facts.
- Do not start the body with a heading or repeat the headline; start directly with the first paragraph.
- Do not mention these instructions or that the text was rewritten.${fix}
- Relevance gate: this site only covers U.S. business, markets, the economy, technology and companies. If the SOURCE is mainly about sports, entertainment, celebrity, crime, lifestyle, foreign politics or anything with no clear U.S. business angle, return ONLY {"off_topic": true} and nothing else.
- "seo_title" must be at most 55 characters. Use plain ASCII spaces and hyphens.

Return ONLY a JSON object with these keys:
"headline" (max 95 characters, specific, no trailing source name),
"summary" (max 160 characters, plain sentence),
"seo_title" (max 60 characters, includes the main subject),
"seo_description" (max 155 characters, compelling and accurate),
"body" (markdown, as described),
"tags" (3 to 5 short topical tags, e.g. company names or themes),
"image_prompt" (one sentence describing a generic editorial illustration of the topic; no real people, no logos, no text),
"image_alt" (one factual sentence describing that illustration for screen readers, max 125 characters).

SOURCE (${src.source_name ?? "unknown"}), headline: ${src.title}
${(src.content ?? "").slice(0, 14_000)}`;
}

async function writeDraft(src: Source, feedback: string[]): Promise<Draft> {
  const draft = await askJson<Draft>(draftPrompt(src, feedback));
  if (draft.off_topic === true) throw new OffTopicError("off-topic for a U.S. business site");
  for (const key of ["headline", "summary", "body", "image_prompt", "image_alt"] as const) {
    if (typeof draft[key] !== "string" || !draft[key].trim()) throw new Error(`Draft missing ${key}`);
  }
  // The page renders the headline itself; drop any heading the model repeats at the top.
  draft.body = draft.body.replace(/^\s*(#{1,6}[^\n]*\n+)+/, "").trim();
  draft.tags = Array.isArray(draft.tags) ? draft.tags.map(String).slice(0, 5) : [];
  for (const key of ["headline", "summary", "body", "seo_title", "seo_description", "image_alt"] as const) {
    if (typeof draft[key] === "string") draft[key] = normalizeText(draft[key]);
  }
  draft.tags = draft.tags.map((t) => normalizeText(t.trim()));
  draft.seo_title = (draft.seo_title || draft.headline).slice(0, 70);
  draft.seo_description = (draft.seo_description || draft.summary).slice(0, 160);
  draft.headline = draft.headline.trim().slice(0, 120);
  draft.summary = draft.summary.trim().slice(0, 200);
  draft.image_alt = draft.image_alt.trim().slice(0, 140);
  return draft;
}

async function factCheck(src: Source, draft: Draft): Promise<string[]> {
  const prompt = `You are a strict fact-checker. The ARTICLE is based on reporting by ${src.source_name ?? "a named publisher"}; naming that publisher as the origin of the reporting is allowed and is not a problem. Compare the ARTICLE to the SOURCE. List every statement in the ARTICLE that is NOT supported by the SOURCE: wrong or invented numbers, dates, names, titles, quotes, places, causes or conclusions. Ignore style and wording differences, and ignore harmless connective phrasing.

Return ONLY JSON: {"unsupported": ["short description of each problem"]}. Use an empty array if everything is supported.

SOURCE:
${(src.content ?? "").slice(0, 14_000)}

ARTICLE:
${draft.headline}
${draft.summary}
${draft.body}`;
  const result = await askJson<{ unsupported?: unknown }>(prompt);
  return Array.isArray(result.unsupported) ? result.unsupported.map(String).filter(Boolean) : [];
}

function storageUrl(path: string): string {
  const base = (process.env["SUPABASE_URL"] ?? "").replace(/\/$/, "");
  return `${base}/storage/v1/object/public/media/${path}`;
}

async function upload(path: string, bytes: Uint8Array, contentType: string): Promise<string> {
  const { error } = await supabaseAdmin.storage.from("media").upload(path, bytes, { contentType, upsert: true });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return storageUrl(path);
}

/** Print-magazine look: grayscale, a touch more contrast, light film grain. Guarantees black and white whatever the model returns. */
function toMonochrome(input: Buffer): Buffer {
  if (input[0] !== 0xff || input[1] !== 0xd8) return input; // not a JPEG; the site's CSS grayscale still covers it
  const img = jpeg.decode(input, { useTArray: true, formatAsRGBA: true });
  const px = img.data;
  let seed = 1234567;
  for (let i = 0; i < px.length; i += 4) {
    const luma = 0.299 * px[i]! + 0.587 * px[i + 1]! + 0.114 * px[i + 2]!;
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const grain = ((seed >>> 24) / 255 - 0.5) * 14;
    const v = Math.max(0, Math.min(255, (luma - 128) * 1.12 + 128 + grain));
    px[i] = px[i + 1] = px[i + 2] = v;
  }
  return Buffer.from(jpeg.encode({ data: px, width: img.width, height: img.height }, 88).data);
}

async function makeImage(draft: Draft, slug: string): Promise<string | null> {
  const key = env("OPENROUTER_API_KEY");
  if (!key) return null;
  const prompt = `Black-and-white editorial illustration in the style of a vintage print newspaper or 1950s business magazine: monochrome ink and halftone, strong contrast, fine film grain, classic composition, 16:9. Strictly black, white and grey tones only, no color. ${draft.image_prompt}. Absolutely no text, no letters, no logos, no real people or faces.`;
  const res = await retryingFetch(
    "https://openrouter.ai/api/v1/images",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
        "HTTP-Referer": "https://usbusiness.forum",
        "X-Title": "US Business Forum",
      },
      body: JSON.stringify({ model: IMAGE_MODEL, prompt }),
    },
    120_000,
    2,
  );
  if (!res.ok) throw new Error(`Image model ${res.status}`);
  const json = (await res.json()) as { data?: { b64_json?: string }[] };
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new Error("Image model returned no image");
  return upload(`images/${slug}.jpg`, toMonochrome(Buffer.from(b64, "base64")), "image/jpeg");
}

function plainText(markdown: string): string {
  return markdown
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_#>`]/g, "")
    .replace(/\s+\n/g, "\n")
    .trim();
}

function chunkText(text: string, size: number): string[] {
  const out: string[] = [];
  let current = "";
  for (const para of text.split(/\n{2,}/)) {
    if ((current + "\n\n" + para).length > size && current) {
      out.push(current);
      current = para;
    } else {
      current = current ? `${current}\n\n${para}` : para;
    }
  }
  if (current) out.push(current);
  return out.flatMap((c) => (c.length <= size ? [c] : c.match(new RegExp(`.{1,${size}}(\\s|$)`, "g")) ?? [c]));
}

function pcmToMp3(pcm: Uint8Array, sampleRate = 44100): Uint8Array {
  const samples = new Int16Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.byteLength / 2));
  const encoder = new Mp3Encoder(1, sampleRate, 64);
  const parts: Uint8Array[] = [];
  for (let i = 0; i < samples.length; i += 1152) {
    const buf = encoder.encodeBuffer(samples.subarray(i, i + 1152));
    if (buf.length) parts.push(new Uint8Array(buf));
  }
  const tail = encoder.flush();
  if (tail.length) parts.push(new Uint8Array(tail));
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

async function makeAudio(draft: Draft, slug: string): Promise<string | null> {
  const key = env("OPENROUTER_API_KEY");
  if (!key) return null;
  const script = `${draft.headline}.\n\n${plainText(draft.body)}`;
  const pcmParts: Uint8Array[] = [];
  for (const chunk of chunkText(script, TTS_CHUNK_CHARS)) {
    const res = await retryingFetch(
      "https://openrouter.ai/api/v1/audio/speech",
      {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
        body: JSON.stringify({ model: VOICE_MODEL, input: chunk, voice: VOICE }),
      },
      120_000,
      2,
    );
    if (!res.ok) throw new Error(`Voice model ${res.status}`);
    pcmParts.push(new Uint8Array(await res.arrayBuffer()));
  }
  const pcm = new Uint8Array(pcmParts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const p of pcmParts) {
    pcm.set(p, offset);
    offset += p.length;
  }
  return upload(`audio/${slug}.mp3`, pcmToMp3(pcm), "audio/mpeg");
}

/** Writes, checks, illustrates and narrates one story; returns the new slug or a hold reason. */
async function processStory(src: Source): Promise<{ slug: string } | { held: string }> {
  const feedback: string[] = [];
  let draft: Draft | null = null;
  let attempts = 0;
  let overlap = 0;
  let lastProblem = "no draft produced";

  while (attempts < MAX_ATTEMPTS) {
    attempts += 1;
    let candidate: Draft;
    try {
      candidate = await writeDraft(src, feedback);
    } catch (error) {
      if (error instanceof OffTopicError) return { held: error.message };
      lastProblem = (error as Error).message;
      continue;
    }

    overlap = overlapRatio(candidate.body, src.content ?? "");
    if (overlap > MAX_OVERLAP) {
      lastProblem = `too close to the source (${Math.round(overlap * 100)}% shared phrasing)`;
      feedback.splice(0, feedback.length, "The wording is too close to the SOURCE. Rewrite every sentence from scratch with different structure and vocabulary.");
      continue;
    }

    let problems: string[];
    try {
      problems = await factCheck(src, candidate);
    } catch (error) {
      lastProblem = `fact-check failed: ${(error as Error).message}`;
      continue;
    }
    if (problems.length > 0) {
      lastProblem = `unsupported claims: ${problems.slice(0, 3).join("; ")}`;
      feedback.splice(0, feedback.length, ...problems.slice(0, 6).map((p) => `Unsupported claim, remove or correct it: ${p}`));
      continue;
    }

    draft = candidate;
    break;
  }

  if (!draft) return { held: lastProblem };

  const slug = `${slugify(draft.headline)}-${shortHash(src.slug)}`;
  const [imageUrl, audioUrl] = await Promise.all([
    makeImage(draft, slug).catch((error) => {
      console.error("image", slug, (error as Error).message);
      return null;
    }),
    makeAudio(draft, slug).catch((error) => {
      console.error("audio", slug, (error as Error).message);
      return null;
    }),
  ]);

  const sourceLine = src.source_url
    ? `\n\n**Source:** [${src.title} — ${src.source_name ?? "original report"}](${src.source_url})`
    : "";

  const { error } = await supabaseAdmin.from("articles").insert({
    slug,
    title: draft.headline,
    summary: draft.summary,
    content: `${draft.body.trim()}${sourceLine}`,
    author: SITE_AUTHOR,
    source_name: src.source_name,
    source_url: src.source_url,
    image_url: imageUrl,
    image_alt: draft.image_alt,
    audio_url: audioUrl,
    seo_title: draft.seo_title,
    seo_description: draft.seo_description,
    tags: draft.tags,
    category: src.category,
    published_at: new Date().toISOString(),
    status: "published",
    ai_generated: true,
    is_original: false,
    is_featured: false,
    source_slug: src.slug,
    generation_notes: { model: textConfig().model, attempts, overlap: Number(overlap.toFixed(3)), image: Boolean(imageUrl), audio: Boolean(audioUrl) },
  });
  if (error) return { held: `insert failed: ${error.message}` };
  return { slug };
}

/**
 * Picks fresh raw stories that have a full body, and publishes AI articles for them.
 * Stops starting new stories once `budgetMs` has elapsed.
 */
export async function runGeneration(options: {
  limit?: number;
  budgetMs?: number;
  maxAgeHours?: number;
  dailyLimit?: number;
}): Promise<GenerationResult> {
  const limit = options.limit ?? 3;
  const budgetMs = options.budgetMs ?? 150_000;
  const maxAgeHours = options.maxAgeHours ?? 36;
  const dailyLimit = options.dailyLimit ?? Number(env("DAILY_ARTICLE_LIMIT") ?? 40);
  const started = Date.now();
  const result: GenerationResult = { considered: 0, published: [], held: [] };

  const dayAgo = new Date(Date.now() - 24 * 3600_000).toISOString();
  const { count } = await supabaseAdmin
    .from("articles")
    .select("id", { count: "exact", head: true })
    .eq("ai_generated", true)
    .eq("status", "published")
    .gte("published_at", dayAgo);
  const room = dailyLimit - (count ?? 0);
  if (room <= 0) return { ...result, skipped: `daily limit of ${dailyLimit} reached` };

  const since = new Date(Date.now() - maxAgeHours * 3600_000).toISOString();
  const [{ data: raw }, { data: done }] = await Promise.all([
    supabaseAdmin
      .from("articles")
      .select("slug,title,summary,content,source_name,source_url,category,published_at")
      .eq("status", "raw")
      .eq("ai_generated", false)
      .gte("published_at", since)
      .order("published_at", { ascending: false })
      .limit(250),
    supabaseAdmin.from("articles").select("source_slug").not("source_slug", "is", null),
  ]);

  const handled = new Set((done ?? []).map((r) => r.source_slug as string));
  const perCategory = new Map<string, number>();
  const queue: Source[] = [];
  for (const row of (raw ?? []) as Source[]) {
    if (handled.has(row.slug)) continue;
    if ((row.content?.length ?? 0) < 1200) continue;
    const used = perCategory.get(row.category) ?? 0;
    if (used >= 2) continue; // spread each run across sections
    perCategory.set(row.category, used + 1);
    queue.push(row);
    if (queue.length >= Math.min(limit, room)) break;
  }

  for (const src of queue) {
    if (Date.now() - started > budgetMs) break;
    result.considered += 1;
    try {
      const outcome = await processStory(src);
      if ("slug" in outcome) {
        result.published.push(outcome.slug);
      } else {
        result.held.push({ source: src.slug, reason: outcome.held });
        // Park it so we never pay to retry the same failing story.
        await supabaseAdmin.from("articles").insert({
          slug: `held-${shortHash(src.slug)}-${Date.now().toString(36)}`,
          title: src.title,
          category: src.category,
          status: "held",
          ai_generated: true,
          source_slug: src.slug,
          source_name: src.source_name,
          source_url: src.source_url,
          generation_notes: { reason: outcome.held },
        });
      }
    } catch (error) {
      result.held.push({ source: src.slug, reason: (error as Error).message });
    }
  }
  return result;
}
