import { createFileRoute } from "@tanstack/react-router";

// Spends AI credits, so it is protected by a shared secret (GENERATE_SECRET).
// Called on a schedule by Supabase pg_cron; see the setup SQL in the README.
async function handle(request: Request): Promise<Response> {
  const secret = process.env["GENERATE_SECRET"];
  if (!secret) return Response.json({ ok: false, error: "GENERATE_SECRET is not configured" }, { status: 503 });

  const url = new URL(request.url);
  const provided =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? url.searchParams.get("key");
  if (provided !== secret) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });

  try {
    const { runGeneration } = await import("@/lib/ai.server");
    const limit = Number(url.searchParams.get("limit") ?? 3);
    const maxAgeHours = Number(url.searchParams.get("maxAgeHours") ?? 36);
    const result = await runGeneration({
      limit: Math.min(Math.max(limit, 1), 10),
      maxAgeHours: Math.min(Math.max(maxAgeHours, 1), 168),
    });
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return Response.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}

export const Route = createFileRoute("/api/public/generate")({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
    },
  },
});
