import { createFileRoute } from "@tanstack/react-router";

import { SITE_NAME, SITE_URL } from "@/lib/site";

const esc = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const Route = createFileRoute("/rss.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { publicClient } = await import("@/lib/public-client.server");
        const { data } = await publicClient()
          .from("articles")
          .select("slug,title,summary,category,published_at,image_url,audio_url,author")
          .order("published_at", { ascending: false })
          .limit(50);

        const items = (data ?? [])
          .map((a) => {
            const link = `${SITE_URL}/article/${a.slug}`;
            return `    <item>
      <title>${esc(a.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${new Date(a.published_at).toUTCString()}</pubDate>
      <category>${esc(a.category)}</category>
      <description>${esc(a.summary ?? "")}</description>${a.audio_url ? `\n      <enclosure url="${esc(a.audio_url)}" type="audio/mpeg" length="0"/>` : ""}
    </item>`;
          })
          .join("\n");

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${SITE_NAME}</title>
    <link>${SITE_URL}</link>
    <description>U.S. business news, markets, technology and the economy.</description>
    <language>en-us</language>
${items}
  </channel>
</rss>
`;
        return new Response(xml, {
          headers: { "content-type": "application/rss+xml; charset=utf-8", "cache-control": "public, max-age=0, s-maxage=600" },
        });
      },
    },
  },
});
