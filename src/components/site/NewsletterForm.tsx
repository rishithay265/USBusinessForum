import { useState } from "react";

import { subscribeToNewsletter } from "@/lib/news.functions";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setState("sending");
    try {
      const result = await subscribeToNewsletter({ data: { email } });
      if (result.ok) {
        setState("done");
        setMessage("You're on the list. Watch for the next briefing.");
        setEmail("");
      } else {
        setState("error");
        setMessage(result.error);
      }
    } catch {
      setState("error");
      setMessage("Could not subscribe right now. Please try again.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-md" aria-label="Newsletter signup">
      <p className="kicker mb-2">The Morning Brief</p>
      <p className="mb-3 text-sm text-muted-foreground">
        The day's most important U.S. business stories, in your inbox.
      </p>
      <div className="flex gap-2">
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <input
          id="newsletter-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="min-w-0 flex-1 rounded-sm border border-input bg-background px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={state === "sending"}
          className="rounded-sm bg-primary px-4 py-2 font-sans text-xs font-semibold uppercase tracking-wider text-primary-foreground disabled:opacity-60"
        >
          {state === "sending" ? "Sending…" : "Subscribe"}
        </button>
      </div>
      {message ? (
        <p role="status" className={`mt-2 text-xs ${state === "error" ? "text-destructive" : "text-muted-foreground"}`}>
          {message}
        </p>
      ) : null}
    </form>
  );
}
