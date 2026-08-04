import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client — uses service role key, bypasses RLS.
 * No auth session required. Safe for personal single-user deployment.
 */
export async function createClient(): Promise<SupabaseClient> {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

/**
 * Synchronous service-role client — kept for API route compatibility.
 */
export function createServiceClient(): SupabaseClient {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

/**
 * Get the owner user identity from environment variables.
 * No Supabase auth session required — single-user, no login.
 */
export async function getAllowlistedUser(): Promise<{ id: string; email: string }> {
  const id = process.env.TARGET_USER_ID;
  const email = process.env.ALLOWED_USER_EMAIL;

  if (!id || !email) {
    throw new AuthError(
      "NO_CONFIG",
      "TARGET_USER_ID or ALLOWED_USER_EMAIL is not set in environment",
    );
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
