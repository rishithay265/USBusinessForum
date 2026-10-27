import type { Article } from "@/lib/news.functions";
import { LeadStory, StoryCard, BriefItem } from "@/components/site/ArticleCard";

export function SectionPage({
  title,
  blurb,
  articles,
}: {
  title: string;
  blurb: string;
  articles: Article[];
}) {
  const [lead, ...rest] = articles;
  const grid = rest.slice(0, 12);
  const briefs = rest.slice(12);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="rule-top pt-4 pb-8">
        <h1 className="text-4xl font-bold sm:text-5xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-lg text-muted-foreground">{blurb}</p>
      </header>

      {!lead ? (
        <p className="py-16 text-center text-muted-foreground">
          Stories for this section are being collected. The newsroom feed refreshes every five
          minutes.
        </p>
      ) : (
        <>
          <div className="hairline pt-8">
            <LeadStory article={lead} />
          </div>

          {grid.length > 0 ? (
            <div className="rule-top grid gap-8 pt-8 md:grid-cols-3">
              {grid.map((article) => (
                <StoryCard key={article.slug} article={article} />
              ))}
            </div>
          ) : null}


          {briefs.length > 0 ? (
            <section className="rule-top mt-10 pt-6">
              <h2 className="kicker mb-4">More from {title}</h2>
              <div className="grid gap-x-10 md:grid-cols-2">
                {briefs.map((article) => (
                  <BriefItem key={article.slug} article={article} />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
