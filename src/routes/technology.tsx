import { createFileRoute } from "@tanstack/react-router";

import { listArticles } from "@/lib/news.functions";
import { SectionPage } from "@/components/site/SectionPage";
import { SECTIONS } from "@/lib/categories";
import { PAGE_CACHE, sectionHead } from "@/lib/seo";

const section = SECTIONS[1]!;

export const Route = createFileRoute("/technology")({
  head: () => sectionHead(section.label, section.path, section.blurb),
  headers: () => PAGE_CACHE,
  loader: () => listArticles({ data: { category: "technology", limit: 60 } }),
  component: TechnologyPage,
});

function TechnologyPage() {
  return <SectionPage title="Technology" blurb={section.blurb} articles={Route.useLoaderData()} />;
}
