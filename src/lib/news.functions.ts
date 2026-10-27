import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { ORIGINAL_ARTICLES } from "@/content/original-articles";
import { cleanSummary } from "@/lib/text";

export type Article = {
  slug: string;
  title: string;
  summary: string | null;
  content: string | null;
  author: string | null;
  source_name: string | null;
  source_url: string | null;
  image_url: string | null;
  category: string;
  published_at: string;
  is_original: boolean;
  is_featured: boolean;
  image_alt?: string | null;
  audio_url?: string | null;
  ai_generated?: boolean | null;
  tags?: string[] | null;
  seo_title?: string | null;
  seo_description?: string | null;
};

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

function originals(): Article[] {
  return ORIGINAL_ARTICLES.map((a) => ({ ...a }));
}
const COLUMNS =
  "slug,title,summary,content,author,source_name,source_url,image_url,category,published_at,is_original,is_featured,image_alt,audio_url,ai_generated,tags,seo_title,seo_description";

/** Articles published inside an explicit date window (U.S. Eastern days). */
export const listArticlesByDate = createServerFn({ method: "GET" })
  .inputValidator((data: { from: string; to: string; category?: string; limit?: number }) => data)
  .handler(async ({ data }) => {
    const limit = Math.min(data.limit ?? 120, 300);
    const supabase = publicClient();

    let query = supabase
      .from("articles")
      .select(COLUMNS)
      .gte("published_at", data.from)
      .lte("published_at", data.to)
      .order("published_at", { ascending: false })
      .limit(limit);

    if (data.category) query = query.eq("category", data.category);

    const { data: rows, error } = await query;
    if (error) console.error("listArticlesByDate", error.message);

    const fromMs = +new Date(data.from);
    const toMs = +new Date(data.to);
    const local = originals().filter((a) => {
      const t = +new Date(a.published_at);
      return t >= fromMs && t <= toMs && (!data.category || a.category === data.category);
    });

    return [...local, ...((rows ?? []) as Article[])]
      .sort((a, b) => +new Date(b.published_at) - +new Date(a.published_at))
      .slice(0, limit);
  });

/** Days that actually hold coverage, for the archive calendar hints. */
export const getArchiveDays = createServerFn({ method: "GET" })
  .inputValidator((data: { days?: number } = {}) => data)
  .handler(async ({ data }) => {
    const days = Math.min(data.days ?? 45, 180);
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const supabase = publicClient();

    const { data: rows, error } = await supabase
      .from("articles")
      .select("published_at")
      .gte("published_at", since)
      .order("published_at", { ascending: false })
      .limit(2000);

    if (error) console.error("getArchiveDays", error.message);

    const counts = new Map<string, number>();
    const add = (iso: string) => {
      const key = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/New_York",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(iso));
      counts.set(key, (counts.get(key) ?? 0) + 1);
    };

    for (const row of rows ?? []) add((row as { published_at: string }).published_at);
    for (const a of originals()) {
      if (+new Date(a.published_at) >= +new Date(since)) add(a.published_at);
    }

    return [...counts.entries()]
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  });


export const listArticles = createServerFn({ method: "GET" })
  .inputValidator((data: { category?: string; limit?: number }) => data ?? {})
  .handler(async ({ data }) => {
    const limit = Math.min(data.limit ?? 60, 120);
    const supabase = publicClient();
    let query = supabase
      .from("articles")
      .select(COLUMNS)
      .order("published_at", { ascending: false })
      .limit(limit);

    if (data.category) query = query.eq("category", data.category);

    const { data: rows, error } = await query;
    if (error) console.error("listArticles", error.message);

    const scraped = (rows ?? []) as Article[];
    const local = data.category
      ? originals().filter((a) => a.category === data.category)
      : originals();

    return [...local, ...scraped]
      .sort((a, b) => +new Date(b.published_at) - +new Date(a.published_at))
      .slice(0, limit);

  });

export const getArticle = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const local = originals().find((a) => a.slug === data.slug);
    const supabase = publicClient();

    if (local) {
      const { data: localRelated } = await supabase
        .from("articles")
        .select(COLUMNS)
        .eq("category", local.category)
        .order("published_at", { ascending: false })
        .limit(5);
      return { article: local, related: (localRelated ?? []) as Article[] };
    }


    const { data: row } = await supabase
      .from("articles")
      .select(COLUMNS)
      .eq("slug", data.slug)
      .maybeSingle();

    if (!row) return { article: null, related: [] as Article[] };

    const { data: related } = await supabase
      .from("articles")
      .select(COLUMNS)
      .eq("category", (row as Article).category)
      .neq("slug", data.slug)
      .order("published_at", { ascending: false })
      .limit(5);

    return { article: row as Article, related: (related ?? []) as Article[] };
  });

export const getIngestStatus = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  const { data } = await supabase
    .from("ingest_runs")
    .select("started_at,finished_at,status,inserted_count,updated_count")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
});

export const searchArticles = createServerFn({ method: "GET" })
  .inputValidator((data: { q?: string; limit?: number }) => data ?? {})
  .handler(async ({ data }) => {
    const query = (data.q ?? "").trim().slice(0, 120);
    const limit = Math.min(data.limit ?? 20, 40);
    if (!query || query.length < 2) return [] as Article[];

    const supabase = publicClient();
    const { data: rows, error } = await supabase
      .from("articles")
      .select(COLUMNS)
      .or(`title.ilike.%${query}%,summary.ilike.%${query}%,content.ilike.%${query}%`)
      .order("published_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("searchArticles", error.message);
      return [] as Article[];
    }

    const local = originals().filter(
      (a) =>
        a.title.toLowerCase().includes(query.toLowerCase()) ||
        (a.summary ?? "").toLowerCase().includes(query.toLowerCase()) ||
        (a.content ?? "").toLowerCase().includes(query.toLowerCase()),
    );

    return [...local, ...(rows ?? [])]
      .sort((a, b) => +new Date(b.published_at) - +new Date(a.published_at))
      .slice(0, limit) as Article[];
  });

export const recordArticleView = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const supabase = publicClient();
    await supabase.from("article_views").insert({ slug: data.slug });
    return { ok: true };
  });

export const getMostRead = createServerFn({ method: "GET" })
  .inputValidator((data: { hours?: number; limit?: number } = {}) => data)
  .handler(async ({ data }) => {
    const hours = Math.min(data.hours ?? 24, 168);
    const limit = Math.min(data.limit ?? 6, 20);
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const supabase = publicClient();
    const { data: rows, error } = await supabase.rpc("get_most_read", {
      since,
      limit_count: limit,
    });

    if (error) {
      console.error("getMostRead", error.message);
      return [] as Article[];
    }

    const slugs = (rows ?? []).map((r: { slug: string }) => r.slug);
    if (slugs.length === 0) return [] as Article[];

    const { data: articles, error: articlesError } = await supabase
      .from("articles")
      .select(COLUMNS)
      .in("slug", slugs);

    if (articlesError) {
      console.error("getMostRead articles", articlesError.message);
      return [] as Article[];
    }

    const localMap = new Map(originals().map((a) => [a.slug, a]));
    const remoteMap = new Map((articles ?? []).map((a) => [a.slug, a]));
    return slugs
      .map((s) => localMap.get(s) ?? remoteMap.get(s))
      .filter(Boolean) as Article[];
  });

export const subscribeToNewsletter = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string }) => data)
  .handler(async ({ data }) => {
    const email = (data.email ?? "").trim().toLowerCase().slice(0, 254);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false as const, error: "Enter a valid email address." };
    const supabase = publicClient();
    const { error } = await supabase.from("subscribers").insert({ email });
    // 23505 = already subscribed; treat as success.
    if (error && error.code !== "23505") {
      console.error("subscribe", error.message);
      return { ok: false as const, error: "Could not subscribe right now. Please try again." };
    }
    return { ok: true as const };
  });
