import { SITE_NAME, SITE_URL } from "@/lib/site";

/** Tag pages with fewer stories are noindexed and left out of the sitemap. */
export const MIN_TAG_ARTICLES = 2;

export const PAGE_CACHE = {
  "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=600",
};

export function canonical(path: string) {
  return { rel: "canonical", href: `${SITE_URL}${path === "/" ? "" : path}` };
}

/** "Title — Brand" when it fits in a search snippet, otherwise the title alone. */
export function pageTitle(title: string, max = 60): string {
  const withBrand = `${title} — ${SITE_NAME}`;
  if (withBrand.length <= max) return withBrand;
  if (title.length <= max) return title;
  const cut = title.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ") > 30 ? cut.lastIndexOf(" ") : cut.length)}…`;
}

export function ldScript(data: unknown) {
  return { type: "application/ld+json", children: JSON.stringify(data) };
}

export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.path === "/" ? "" : item.path}`,
    })),
  };
}

export function sectionHead(label: string, path: string, blurb: string) {
  const title = `${label} — ${SITE_NAME}`;
  return {
    meta: [
      { title },
      { name: "description", content: blurb },
      { property: "og:title", content: title },
      { property: "og:description", content: blurb },
      { property: "og:url", content: `${SITE_URL}${path}` },
    ],
    links: [canonical(path)],
    scripts: [
      ldScript({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: title,
        description: blurb,
        url: `${SITE_URL}${path}`,
        isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
      }),
      ldScript(breadcrumbLd([{ name: "Home", path: "/" }, { name: label, path }])),
    ],
  };
}
