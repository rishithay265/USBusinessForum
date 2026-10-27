import { createFileRoute, Link } from "@tanstack/react-router";

import { listArticlesByTag } from "@/lib/news.functions";
import { StoryCard } from "@/components/site/ArticleCard";
import { MIN_TAG_ARTICLES, PAGE_CACHE, breadcrumbLd, canonical, ldScript } from "@/lib/seo";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const Route = createFileRoute("/tag/$tag")({
  loader: ({ params }) => listArticlesByTag({ data: { tag: params.tag } }),
  head: ({ params, loaderData }) => {
    const path = `/tag/${encodeURIComponent(params.tag)}`;
    const thin = (loaderData?.length ?? 0) < MIN_TAG_ARTICLES;
    const title = `${params.tag}: latest U.S. business news — ${SITE_NAME}`;
    const description = `Original reporting and analysis tagged ${params.tag} from ${SITE_NAME}.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        ...(thin ? [{ name: "robots", content: "noindex, follow" }] : []),
      ],
      links: [canonical(path)],
      scripts: [
        ldScript(breadcrumbLd([{ name: "Home", path: "/" }, { name: params.tag, path }])),
        ldScript({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: title,
          url: `${SITE_URL}${path}`,
        }),
      ],
    };
  },
  headers: () => PAGE_CACHE,
  component: TagPage,
});

function TagPage() {
  const { tag } = Route.useParams();
  const articles = Route.useLoaderData();
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="rule-top pt-4 pb-8">
        <p className="kicker">Topic</p>
        <h1 className="mt-2 text-4xl font-bold sm:text-5xl">{tag}</h1>
        <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
          The latest {SITE_NAME} coverage tagged {tag}.
        </p>
      </header>
      {articles.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">
          No stories carry this tag yet.{" "}
          <Link to="/" className="underline">
            Back to the front page
          </Link>
        </p>
      ) : (
        <div className="grid gap-8 md:grid-cols-3">
          {articles.map((article) => (
            <StoryCard key={article.slug} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}
