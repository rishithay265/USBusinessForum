import { createFileRoute } from "@tanstack/react-router";

import { listArticles } from "@/lib/news.functions";
import { SectionPage } from "@/components/site/SectionPage";
import { SECTIONS } from "@/lib/categories";
import { PAGE_CACHE, sectionHead } from "@/lib/seo";

const section = SECTIONS[0]!;

export const Route = createFileRoute("/markets")({
  head: () => sectionHead(section.label, section.path, section.blurb),
  headers: () => PAGE_CACHE,
  loader: () => listArticles({ data: { category: "markets", limit: 60 } }),
  component: MarketsPage,
});

function MarketsPage() {
  return <SectionPage title="Markets" blurb={section.blurb} articles={Route.useLoaderData()} />;
}
