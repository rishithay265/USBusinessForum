import { Link } from "@tanstack/react-router";
import { useState } from "react";

import logo from "@/assets/usbf-logo.png";
import { SECTIONS } from "@/lib/categories";
import { formatUSWeekday, formatUSTime } from "@/lib/format";
import { SearchOverlay } from "@/components/site/SearchOverlay";
import { ThemeToggle } from "@/components/site/ThemeToggle";

function SearchIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

export function SiteHeader({ now }: { now: string }) {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="bg-background">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex items-center justify-between py-2 meta-line">
          <span className="hidden sm:block">{formatUSWeekday(now)}</span>
          <span className="hidden md:block">U.S. Edition &middot; New York</span>
          <span>{formatUSTime(now)}</span>
        </div>

        <div className="hairline" />

        <div className="flex justify-center py-6">
          <Link to="/" aria-label="US Business Forum home">
            <img
              src={logo}
              alt="US Business Forum"
              className="h-16 w-auto sm:h-20 md:h-24 dark:invert dark:mix-blend-screen"
              width={960}
              height={240}
            />
          </Link>
        </div>

        <nav className="rule-top hairline">
          <ul className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2 py-3 font-sans text-[0.72rem] font-semibold uppercase tracking-[0.16em]">
            <li>
              <Link
                to="/"
                activeOptions={{ exact: true }}
                className="transition-colors hover:text-accent"
                activeProps={{ className: "text-accent" }}
              >
                Front Page
              </Link>
            </li>
            {SECTIONS.map((section) => (
              <li key={section.key}>
                <Link
                  to={section.path}
                  className="transition-colors hover:text-accent"
                  activeProps={{ className: "text-accent" }}
                >
                  {section.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                to="/archive"
                className="transition-colors hover:text-accent"
                activeProps={{ className: "text-accent" }}
              >
                Archive
              </Link>
            </li>
            <li>
              <button
                onClick={() => setSearchOpen(true)}
                className="inline-flex items-center gap-1.5 transition-colors hover:text-accent"
                aria-label="Open search"
              >
                <SearchIcon className="h-4 w-4" />
                <span className="sr-only">Search</span>
              </button>
            </li>
            <li>
              <ThemeToggle />
            </li>
          </ul>
        </nav>
      </div>

      {searchOpen ? <SearchOverlay onClose={() => setSearchOpen(false)} /> : null}
    </header>
  );
}
