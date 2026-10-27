import { useState } from "react";

import { SITE_URL } from "@/lib/site";

export function ShareButtons({ title, slug }: { title: string; slug: string }) {
  const [copied, setCopied] = useState(false);
  const url = `${SITE_URL}/article/${slug}`;
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // fall through to manual options
      }
    }
    handleCopy();
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="meta-line">Share</span>
      <button
        onClick={handleShare}
        className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-background px-2.5 py-1.5 font-sans text-xs font-semibold uppercase tracking-wider transition-colors hover:bg-secondary"
        aria-label="Share this story"
      >
        {typeof navigator.share === "function" ? "Share" : "Copy link"}
      </button>
      <a
        href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-background px-2.5 py-1.5 font-sans text-xs font-semibold uppercase tracking-wider transition-colors hover:bg-secondary"
        aria-label="Share on X"
      >
        X
      </a>
      <a
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-background px-2.5 py-1.5 font-sans text-xs font-semibold uppercase tracking-wider transition-colors hover:bg-secondary"
        aria-label="Share on LinkedIn"
      >
        LinkedIn
      </a>
      <a
        href={`mailto:?subject=${encodedTitle}&body=${encodedUrl}`}
        className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-background px-2.5 py-1.5 font-sans text-xs font-semibold uppercase tracking-wider transition-colors hover:bg-secondary"
        aria-label="Share by email"
      >
        Email
      </a>
      {copied ? <span className="meta-line text-accent">Link copied</span> : null}
    </div>
  );
}
