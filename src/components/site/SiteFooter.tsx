import { Link } from "@tanstack/react-router";

import logo from "@/assets/usbf-logo.png";
import { SECTIONS } from "@/lib/categories";
import { NewsletterForm } from "@/components/site/NewsletterForm";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border bg-secondary">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="flex flex-col items-center gap-6 text-center">
          <img src={logo} alt="US Business Forum" className="h-12 w-auto dark:invert dark:mix-blend-screen" />
          <nav>
            <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 font-sans text-[0.7rem] font-semibold uppercase tracking-[0.16em]">
              {SECTIONS.map((section) => (
                <li key={section.key}>
                  <Link to={section.path} className="transition-colors hover:text-accent">
                    {section.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <NewsletterForm />
          <p className="max-w-xl text-sm text-muted-foreground">
            US Business Forum reports on United States business, markets and the economy. Many of
            our stories are written with the help of AI from named publishers' reporting, checked
            automatically against it, and always link back to the original. All times shown are
            U.S. Eastern Time.
          </p>
          <nav aria-label="About">
            <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 font-sans text-[0.7rem] font-semibold uppercase tracking-[0.14em]">
              <li><Link to="/about" className="hover:text-accent">About</Link></li>
              <li><Link to="/editorial-policy" className="hover:text-accent">Editorial &amp; AI policy</Link></li>
              <li><Link to="/privacy" className="hover:text-accent">Privacy</Link></li>
              <li><a href="/rss.xml" className="hover:text-accent">RSS</a></li>
              <li><a href="/sitemap.xml" className="hover:text-accent">Sitemap</a></li>
            </ul>
          </nav>
          <p className="meta-line">
            &copy; {new Date().getFullYear()} US Business Forum &middot; New York
          </p>
        </div>
      </div>
    </footer>
  );
}
