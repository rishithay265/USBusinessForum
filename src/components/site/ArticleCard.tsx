import { Link } from "@tanstack/react-router";

import type { Article } from "@/lib/news.functions";
import { categoryLabel } from "@/lib/categories";
import { formatUSDateTime, timeAgoUS } from "@/lib/format";
import { cleanSummary, extractTags } from "@/lib/text";

function cleanTitle(article: Article) {
  if (article.is_original) return article.title;
  return article.title.replace(/\s+-\s+[^-]{2,40}$/, "");
}

function ArticleImage({
  article,
  aspect,
  eager = false,
}: {
  article: Article;
  aspect: string;
  eager?: boolean;
}) {
  if (!article.image_url) return null;
  return (
    <Link to="/article/$slug" params={{ slug: article.slug }} className="block overflow-hidden bg-muted">
      <img
        src={article.image_url}
        alt={article.image_alt ?? cleanTitle(article)}
        className={`${aspect} w-full object-cover transition-transform duration-500 hover:scale-[1.03]`}
        loading={eager ? "eager" : "lazy"}
      />
    </Link>
  );
}

function Byline({ article, format = "datetime" }: { article: Article; format?: "datetime" | "ago" }) {
  const source = article.source_name ?? "Wire";
  const time = format === "datetime" ? formatUSDateTime(article.published_at) : timeAgoUS(article.published_at);
  return (
    <p className="meta-line mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
      {article.author ? <span className="font-semibold text-foreground/80">By {article.author}</span> : null}
      <span>{source}</span>
      <span aria-hidden="true">·</span>
      <time dateTime={article.published_at}>{time}</time>
    </p>
  );
}

function TopicTags({ article }: { article: Article }) {
  const tags = extractTags(article.title, article.summary);
  if (tags.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center rounded-sm bg-secondary px-2 py-1 font-sans text-[0.65rem] font-semibold uppercase tracking-wider text-secondary-foreground"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

export function LeadStory({ article }: { article: Article }) {
  const summary = cleanSummary(article.summary, 280);
  return (
    <article className="pb-8">
      <ArticleImage article={article} aspect="aspect-[16/9]" eager />
      <p className="kicker mb-3">
        {article.is_original ? "Exclusive" : categoryLabel(article.category)}
      </p>
      <h2 className="text-3xl leading-tight font-bold sm:text-[2.6rem]">
        <Link to="/article/$slug" params={{ slug: article.slug }} className="headline-link">
          {cleanTitle(article)}
        </Link>
      </h2>
      {summary ? (
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-muted-foreground">{summary}</p>
      ) : null}
      <Byline article={article} />
      <TopicTags article={article} />
    </article>
  );
}

export function StoryCard({ article, showImage = true }: { article: Article; showImage?: boolean }) {
  const summary = cleanSummary(article.summary, 160);
  return (
    <article className="flex flex-col gap-3 pb-6">
      {showImage ? <ArticleImage article={article} aspect="aspect-[3/2]" /> : null}
      <p className="kicker">{categoryLabel(article.category)}</p>
      <h3 className="text-xl leading-snug font-bold">
        <Link to="/article/$slug" params={{ slug: article.slug }} className="headline-link">
          {cleanTitle(article)}
        </Link>
      </h3>
      {summary ? (
        <p className="line-clamp-3 text-[0.98rem] leading-relaxed text-muted-foreground">{summary}</p>
      ) : null}
      <Byline article={article} format="ago" />
      <TopicTags article={article} />
    </article>
  );
}

export function BriefItem({ article }: { article: Article }) {
  return (
    <article className="hairline py-4 first:border-t-0 first:pt-0">
      <h4 className="text-base leading-snug font-semibold">
        <Link to="/article/$slug" params={{ slug: article.slug }} className="headline-link">
          {cleanTitle(article)}
        </Link>
      </h4>
      <p className="meta-line mt-2">
        {article.source_name ?? "Wire"} · {timeAgoUS(article.published_at)}
      </p>
    </article>
  );
}
