// Supabase Edge Function: refresh-news
// Invoked by pg_cron every Monday at 09:00 IST.
// Forwards the request to the Next.js /api/cron/refresh-news route
// with the CRON_SECRET header.
//
// Deploy: supabase functions deploy refresh-news --no-verify-jwt

const SHIKHAR_API_BASE = Deno.env.get("SHIKHAR_API_BASE") ?? "";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

Deno.serve(async (_req: Request) => {
  if (!SHIKHAR_API_BASE || !CRON_SECRET) {
    return new Response(
      JSON.stringify({ error: "SHIKHAR_API_BASE and CRON_SECRET must be set" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    const res = await fetch(`${SHIKHAR_API_BASE}/api/cron/refresh-news`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-cron-secret": CRON_SECRET,
      },
      body: JSON.stringify({}),
    });

    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
