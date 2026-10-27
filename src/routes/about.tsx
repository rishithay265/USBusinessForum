import { createFileRoute } from "@tanstack/react-router";

import { InfoPage } from "@/components/site/InfoPage";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — US Business Forum" },
      { name: "description", content: "US Business Forum covers U.S. business, markets, technology and the economy for busy readers." },
    ],
    links: [{ rel: "canonical", href: "https://usbusiness.forum/about" }],
  }),
  component: () => (
    <InfoPage title="About US Business Forum">
      <p>
        US Business Forum is a news site for people who work in and follow American business. We
        cover markets, technology, the economy and companies, and we publish clear summaries of the
        day's most important stories with a short note on why each one matters.
      </p>
      <h2>How our stories are made</h2>
      <p>
        We monitor reporting from established U.S. publishers. For each story we select, our
        system writes an original article in our own words and structure, checks every name, number
        and claim against the original reporting, and discards drafts that fail. Each article names
        and links to the publisher whose reporting it is based on, includes an AI-generated
        illustration labelled as such, and offers an AI-narrated audio version.
      </p>
      <p>
        Read the full details in our <a href="/editorial-policy">editorial and AI policy</a>. We also
        publish original reporting written by our own staff, marked as Exclusive.
      </p>
      <h2>Corrections</h2>
      <p>
        If you believe a story contains an error, tell us through the original publisher's link on
        the article or via the newsletter reply address, and we will correct or remove it.
      </p>
    </InfoPage>
  ),
});
