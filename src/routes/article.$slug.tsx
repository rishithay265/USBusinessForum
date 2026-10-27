import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useEffect } from "react";

import { getArticle, recordArticleView } from "@/lib/news.functions";
import { categoryLabel } from "@/lib/categories";
import { formatUSDateTime, formatReadingTime } from "@/lib/format";
import { readingTime, extractTags, cleanSummary } from "@/lib/text";
import { BriefItem } from "@/components/site/ArticleCard";
import { ReadingProgress } from "@/components/site/ReadingProgress";
import { ShareButtons } from "@/components/site/ShareButtons";
import { ArticleSkeleton } from "@/components/site/Skeletons";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { PAGE_CACHE, breadcrumbLd, canonical, ldScript, pageTitle } from "@/lib/seo";

export const Route = createFileRoute("/article/$slug")({
  loader: async ({ params }) => {
    const result = await getArticle({ data: { slug: params.slug } });
    if (!result.article) throw notFound();
    return result;
  },
  head: ({ loaderData }) => {
    if (!loaderData?.article) {
      return {
        meta: [{ title: "Story unavailable — US Business Forum" }, { name: "robots", content: "noindex" }],
      };
    }
    const { article } = loaderData;
    const description = (article.seo_description ?? article.summary ?? article.title).slice(0, 160);
    const title = article.seo_title ?? article.title;
    const url = `${SITE_URL}/article/${article.slug}`;
    const image = article.image_url
      ? article.image_url.startsWith("http")
        ? article.image_url
        : `${SITE_URL}${article.image_url}`
      : `${SITE_URL}/og-default.png`;
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      headline: article.title.slice(0, 110),
      description,
      image: [image],
      datePublished: article.published_at,
      dateModified: article.published_at,
      author: { "@type": "Organization", name: article.author ?? SITE_NAME },
      publisher: {
        "@type": "Organization",
        name: SITE_NAME,
        logo: { "@type": "ImageObject", url: `${SITE_URL}/og-default.png` },
      },
      mainEntityOfPage: url,
      articleSection: categoryLabel(article.category),
      keywords: (article.tags ?? []).join(", ") || undefined,
    };
    return {
      meta: [
        { title: pageTitle(title) },
        { name: "description", content: description },
        { property: "og:title", content: article.title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "og:image", content: image },
        { property: "article:published_time", content: article.published_at },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: article.title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: image },
      ],
      links: [canonical(`/article/${article.slug}`)],
      scripts: [
        ldScript(jsonLd),
        ldScript(
          breadcrumbLd([
            { name: "Home", path: "/" },
            { name: categoryLabel(article.category), path: `/${article.category}` },
            { name: article.title, path: `/article/${article.slug}` },
          ]),
        ),
      ],
    };
  },
  headers: () => PAGE_CACHE,
  pendingMs: 150,
  pendingMinMs: 300,
  pendingComponent: ArticleSkeleton,
  notFoundComponent: StoryNotFound,
  errorComponent: ({ error }: { error: unknown }) => (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center" role="alert">
      <h1 className="text-3xl font-bold">This story could not be loaded</h1>
      <p className="mt-3 text-muted-foreground">{error instanceof Error ? error.message : String(error)}</p>
      <Link to="/" className="kicker mt-6 inline-block">
        Back to the front page
      </Link>
    </div>
  ),
  component: ArticlePage,
});

function StoryNotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <h1 className="text-3xl font-bold">This story is no longer available</h1>
      <p className="mt-3 text-muted-foreground">
        Wire stories rotate out of our archive. Return to the front page for the latest headlines.
      </p>
      <Link to="/" className="kicker mt-6 inline-block">
        Back to the front page
      </Link>
    </div>
  );
}

function ArticlePage() {
  const { article, related } = Route.useLoaderData();
  if (!article) return <StoryNotFound />;

  const displayTitle = article.is_original
    ? article.title
    : article.title.replace(/\s+-\s+[^-]{2,40}$/, "");

  useEffect(() => {
    recordArticleView({ data: { slug: article.slug } }).catch(() => {
      // ignore analytics errors
    });
  }, [article.slug]);

  const minutes = readingTime(article.content ?? article.summary ?? "");
  const tags = article.tags && article.tags.length > 0 ? article.tags : extractTags(article.title, article.summary);
  const summary = cleanSummary(article.summary, 320);

  return (
    <>
      <ReadingProgress />
      <article className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]">
          <div>
            <p className="kicker">
              {article.is_original ? "Exclusive" : categoryLabel(article.category)}
            </p>
            <h1 className="mt-3 text-4xl leading-[1.1] font-bold sm:text-5xl">{displayTitle}</h1>
            {summary ? (
              <p className="mt-5 text-xl leading-relaxed text-muted-foreground">{summary}</p>
            ) : null}

            <div className="hairline mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 pt-4">
              {article.author ? (
                <span className="font-sans text-sm font-semibold">By {article.author}</span>
              ) : null}
              <span className="meta-line">
                <time dateTime={article.published_at}>{formatUSDateTime(article.published_at)}</time>
              </span>
              {article.source_name ? (
                <span className="meta-line">Source: {article.source_name}</span>
              ) : null}
              <span className="meta-line">{formatReadingTime(minutes)}</span>
            </div>

            {tags.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Link
                    key={tag}
                    to="/tag/$tag"
                    params={{ tag }}
                    className="inline-flex items-center rounded-sm bg-secondary px-2 py-1 font-sans text-[0.65rem] font-semibold uppercase tracking-wider text-secondary-foreground hover:underline"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            ) : null}

            {article.image_url ? (
              <figure className="mt-8">
                <img
                  src={article.image_url}
                  alt={article.image_alt ?? displayTitle}
                  className="aspect-[16/9] w-full object-cover"
                  loading="eager"
                />
                {article.ai_generated ? (
                  <figcaption className="meta-line mt-2">AI-generated image, not an actual photograph of the event</figcaption>
                ) : null}
              </figure>
            ) : null}

            {article.audio_url ? (
              <div className="mt-6 rounded-sm border border-border bg-secondary p-4">
                <p className="kicker mb-2">Listen to this story</p>
                <audio controls preload="none" src={article.audio_url} className="w-full">
                  Your browser does not support audio playback.
                </audio>
                <p className="meta-line mt-2">AI-narrated audio version of this article.</p>
              </div>
            ) : null}

            <div className="article-prose mt-8">
              {article.content ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{article.content}</ReactMarkdown>
              ) : (
                <p>{article.summary}</p>
              )}
            </div>


            {article.ai_generated ? (
              <p className="meta-line mt-8">
                This article was written with the help of AI from reporting by{" "}
                {article.source_name ?? "a named publisher"} and checked automatically against that
                reporting.{" "}
                <Link to="/editorial-policy" className="underline">
                  How we use AI
                </Link>
                .
              </p>
            ) : null}

            <div className="rule-top mt-10 flex flex-wrap items-center justify-between gap-4 pt-5">
              <ShareButtons title={displayTitle} slug={article.slug} />
              {article.source_url ? (
                <a
                  href={article.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="kicker inline-flex items-center gap-2 hover:underline"
                >
                  Read original at {article.source_name ?? "publisher"} &rarr;
                </a>
              ) : null}
            </div>
          </div>

          <aside className="lg:border-l lg:border-border lg:pl-8">
            <h2 className="kicker rule-top pt-3 pb-4">More in {categoryLabel(article.category)}</h2>
            {related.length > 0 ? (
              related.map((item) => <BriefItem key={item.slug} article={item} />)
            ) : (
              <p className="text-sm text-muted-foreground">No related stories yet.</p>
            )}
          </aside>
        </div>
      </article>
    </>
  );
}
