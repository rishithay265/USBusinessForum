import { createFileRoute } from "@tanstack/react-router";

import { SITE_NAME, SITE_URL } from "@/lib/site";

const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Google News sitemap: only stories from the last 48 hours, per Google's spec. */
export const Route = createFileRoute("/news-sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { publicClient } = await import("@/lib/public-client.server");
        const since = new Date(Date.now() - 48 * 3600_000).toISOString();
        const { data } = await publicClient()
          .from("articles")
          .select("slug,title,published_at")
          .gte("published_at", since)
          .order("published_at", { ascending: false })
          .limit(1000);

        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n${(data ?? [])
          .map(
            (a) =>
              `  <url><loc>${SITE_URL}/article/${esc(a.slug)}</loc><news:news><news:publication><news:name>${SITE_NAME}</news:name><news:language>en</news:language></news:publication><news:publication_date>${new Date(a.published_at).toISOString()}</news:publication_date><news:title>${esc(a.title)}</news:title></news:news></url>`,
          )
          .join("\n")}\n</urlset>\n`;

        return new Response(xml, {
          headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=0, s-maxage=300" },
        });
      },
    },
  },
});
