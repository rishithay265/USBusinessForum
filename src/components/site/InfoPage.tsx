import type { ReactNode } from "react";

export function InfoPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-4xl leading-tight font-bold">{title}</h1>
      <div className="article-prose mt-8">{children}</div>
    </main>
  );
}
