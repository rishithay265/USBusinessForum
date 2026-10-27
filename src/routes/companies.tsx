import { createFileRoute } from "@tanstack/react-router";

import { listArticles } from "@/lib/news.functions";
import { SectionPage } from "@/components/site/SectionPage";
import { SECTIONS } from "@/lib/categories";
import { PAGE_CACHE, sectionHead } from "@/lib/seo";

const section = SECTIONS[3]!;

export const Route = createFileRoute("/companies")({
  head: () => sectionHead(section.label, section.path, section.blurb),
  headers: () => PAGE_CACHE,
  loader: () => listArticles({ data: { category: "companies", limit: 60 } }),
  component: CompaniesPage,
});

function CompaniesPage() {
  return <SectionPage title="Companies" blurb={section.blurb} articles={Route.useLoaderData()} />;
}
