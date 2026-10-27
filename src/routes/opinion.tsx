import { createFileRoute } from "@tanstack/react-router";

import { listArticles } from "@/lib/news.functions";
import { SectionPage } from "@/components/site/SectionPage";
import { SECTIONS } from "@/lib/categories";
import { PAGE_CACHE, sectionHead } from "@/lib/seo";

const section = SECTIONS[4]!;

export const Route = createFileRoute("/opinion")({
  head: () => sectionHead(section.label, section.path, section.blurb),
  headers: () => PAGE_CACHE,
  loader: () => listArticles({ data: { category: "opinion", limit: 60 } }),
  component: OpinionPage,
});

function OpinionPage() {
  return <SectionPage title="Opinion" blurb={section.blurb} articles={Route.useLoaderData()} />;
}
