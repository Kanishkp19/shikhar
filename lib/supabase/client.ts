import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client.
 * Uses the anon key + RLS — all reads/writes are scoped to the authenticated
 * user via Row Level Security policies on every table.
 *
 * This client MUST be created lazily (in a function call, not at module top-level)
 * because Next.js serializes module state across server/client boundaries and
 * we don't want a server-side instance leaking into the browser.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
