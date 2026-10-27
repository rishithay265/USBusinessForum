import { createFileRoute, Link } from "@tanstack/react-router";

import { listArticles } from "@/lib/news.functions";
import { LeadStory, StoryCard, BriefItem } from "@/components/site/ArticleCard";
import { MostRead } from "@/components/site/MostRead";
import { SECTIONS } from "@/lib/categories";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "US Business Forum — U.S. Business News, Markets & Companies" },
      {
        name: "description",
        content:
          "Live United States business news: markets, technology, the economy, companies and opinion, refreshed every five minutes from leading American newsrooms.",
      },
      { property: "og:title", content: "US Business Forum — U.S. Business News" },
      {
        property: "og:description",
        content:
          "Live United States business headlines, markets coverage and original reporting, updated continuously.",
      },
    ],
  }),
  loader: async () => {
    try {
      return await listArticles({ data: { limit: 120 } });
    } catch (error) {
      console.error("Front page load failed", error);
      return [];
    }
  },
  component: FrontPage,
});

function FrontPage() {
  const articles = Route.useLoaderData();
  const [lead, ...rest] = articles;
  const secondary = rest.slice(0, 4);
  const column = rest.slice(4, 12);
  const grid = rest.slice(12, 21);
  const briefs = rest.slice(21, 39);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {!lead ? (
        <p className="py-24 text-center text-muted-foreground">
          The newsroom feed is collecting today&apos;s United States business headlines.
        </p>
      ) : (
        <>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,2.1fr)_minmax(0,1fr)]">
            <div>
              <LeadStory article={lead} />
              {secondary.length > 0 ? (
                <div className="rule-top grid gap-8 pt-8 sm:grid-cols-2">
                  {secondary.map((article) => (
                    <StoryCard key={article.slug} article={article} />
                  ))}
                </div>
              ) : null}
            </div>

            <aside className="lg:border-l lg:border-border lg:pl-8">
              <MostRead limit={6} />
              <h2 className="kicker rule-top mt-10 pt-3 pb-4">Latest Business Wire</h2>
              {column.map((article) => (
                <BriefItem key={article.slug} article={article} />
              ))}
            </aside>
          </div>


          {grid.length > 0 ? (
            <section className="rule-top mt-14 pt-6">
              <h2 className="kicker mb-6">Across the U.S. Economy</h2>
              <div className="grid gap-8 md:grid-cols-3">
                {grid.map((article) => (
                  <StoryCard key={article.slug} article={article} />
                ))}
              </div>
            </section>
          ) : null}

          {briefs.length > 0 ? (
            <section className="rule-top mt-14 pt-6">
              <h2 className="kicker mb-2">In Brief</h2>
              <div className="grid gap-x-12 md:grid-cols-3">
                {briefs.map((article) => (
                  <BriefItem key={article.slug} article={article} />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}

      <section className="rule-top mt-14 grid gap-8 pt-6 md:grid-cols-5">
        {SECTIONS.map((section) => (
          <Link key={section.key} to={section.path} className="group">
            <h3 className="text-lg font-bold transition-colors group-hover:text-accent">
              {section.label}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">{section.blurb}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
