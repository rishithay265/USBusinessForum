import { Link } from "@tanstack/react-router";

import logo from "@/assets/usbf-logo.png";
import { SECTIONS } from "@/lib/categories";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border bg-secondary">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="flex flex-col items-center gap-6 text-center">
          <img src={logo} alt="US Business Forum" className="h-12 w-auto" />
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
          <p className="max-w-xl text-sm text-muted-foreground">
            US Business Forum aggregates United States business journalism from leading wire
            services and publishers, refreshed automatically every five minutes, alongside our own
            original reporting. All times shown are U.S. Eastern Time.
          </p>
          <p className="meta-line">
            &copy; {new Date().getFullYear()} US Business Forum &middot; New York
          </p>
        </div>
      </div>
    </footer>
  );
}
