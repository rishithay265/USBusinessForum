import { createFileRoute } from "@tanstack/react-router";

import { ORIGINAL_ARTICLES } from "@/content/original-articles";
import { SECTIONS } from "@/lib/categories";
import { MIN_TAG_ARTICLES } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";

const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { publicClient } = await import("@/lib/public-client.server");
        const { data } = await publicClient()
          .from("articles")
          .select("slug,published_at,tags")
          .order("published_at", { ascending: false })
          .limit(1000);

        const latest = (data ?? [])[0]?.published_at;
        const tagCounts = new Map<string, number>();
        for (const a of data ?? []) for (const t of (a.tags as string[] | null) ?? []) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);

        const urls: { loc: string; lastmod?: string | undefined; priority: string; freq: string }[] = [
          { loc: SITE_URL, lastmod: latest, priority: "1.0", freq: "hourly" },
          ...SECTIONS.map((s) => ({ loc: `${SITE_URL}${s.path}`, lastmod: latest, priority: "0.8", freq: "hourly" })),
          { loc: `${SITE_URL}/archive`, priority: "0.5", freq: "daily" },
          { loc: `${SITE_URL}/about`, priority: "0.3", freq: "yearly" },
          { loc: `${SITE_URL}/editorial-policy`, priority: "0.3", freq: "yearly" },
          ...ORIGINAL_ARTICLES.map((a) => ({ loc: `${SITE_URL}/article/${a.slug}`, lastmod: a.published_at, priority: "0.9", freq: "monthly" })),
          ...[...tagCounts.entries()]
            .filter(([, n]) => n >= MIN_TAG_ARTICLES)
            .map(([t]) => ({ loc: `${SITE_URL}/tag/${encodeURIComponent(t)}`, lastmod: latest, priority: "0.5", freq: "daily" })),
          ...(data ?? []).map((a) => ({ loc: `${SITE_URL}/article/${a.slug}`, lastmod: a.published_at, priority: "0.7", freq: "weekly" })),
        ];

        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
          .map(
            (u) =>
              `  <url><loc>${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${new Date(u.lastmod).toISOString()}</lastmod>` : ""}<changefreq>${u.freq}</changefreq><priority>${u.priority}</priority></url>`,
          )
          .join("\n")}\n</urlset>\n`;

        return new Response(xml, {
          headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=0, s-maxage=900" },
        });
      },
    },
  },
});
