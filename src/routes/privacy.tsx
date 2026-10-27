import { createFileRoute } from "@tanstack/react-router";

import { InfoPage } from "@/components/site/InfoPage";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy — US Business Forum" },
      { name: "description", content: "What data US Business Forum collects and how it is used." },
    ],
    links: [{ rel: "canonical", href: "https://usbusiness.forum/privacy" }],
  }),
  component: () => (
    <InfoPage title="Privacy">
      <p>We keep data collection to a minimum.</p>
      <ul>
        <li><strong>Newsletter.</strong> If you subscribe, we store your email address to send the briefing. You can ask to be removed at any time.</li>
        <li><strong>Article views.</strong> We count how many times each article is opened (without your identity) to show "Most Read".</li>
        <li><strong>Theme preference.</strong> Your light or dark choice is stored in your browser only.</li>
      </ul>
      <p>We do not sell personal data, and we do not run third-party advertising on this site.</p>
    </InfoPage>
  ),
});
