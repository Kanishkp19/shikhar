import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client.
 * Uses the service role key so RLS is bypassed — auth is not required.
 * Safe for personal single-user deployment where login is disabled.
 */
export async function createClient(): Promise<SupabaseClient> {
  // Service role key bypasses RLS — no session needed.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient: createServiceRoleClient } = require("@supabase/supabase-js");
  return createServiceRoleClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

/**
 * Service-role client — same as createClient() now, kept for API route compatibility.
 */
export function createServiceClient(): SupabaseClient {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient: createServiceRoleClient } = require("@supabase/supabase-js");
  return createServiceRoleClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

/**
 * Get the owner user identity from environment variables.
 * No Supabase auth session required — the app is single-user, no login needed.
 */
export async function getAllowlistedUser(): Promise<{ id: string; email: string }> {
  const id = process.env.TARGET_USER_ID;
  const email = process.env.ALLOWED_USER_EMAIL;

  if (!id || !email) {
    throw new AuthError("NO_CONFIG", "TARGET_USER_ID or ALLOWED_USER_EMAIL is not set in environment");
  }

  return { id, email };
}

export class AuthError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}
