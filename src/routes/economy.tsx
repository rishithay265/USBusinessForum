import { createFileRoute } from "@tanstack/react-router";

import { listArticles } from "@/lib/news.functions";
import { SectionPage } from "@/components/site/SectionPage";
import { SECTIONS } from "@/lib/categories";
import { PAGE_CACHE, sectionHead } from "@/lib/seo";

const section = SECTIONS[2]!;

export const Route = createFileRoute("/economy")({
  head: () => sectionHead(section.label, section.path, section.blurb),
  headers: () => PAGE_CACHE,
  loader: () => listArticles({ data: { category: "economy", limit: 60 } }),
  component: EconomyPage,
});

function EconomyPage() {
  return <SectionPage title="Economy" blurb={section.blurb} articles={Route.useLoaderData()} />;
}
