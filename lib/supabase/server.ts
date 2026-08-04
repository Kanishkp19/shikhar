import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client for use in Server Components and Route Handlers.
 * Reads the session cookie set by `@supabase/ssr` on the browser side and
 * forwards it to Supabase so RLS sees the authenticated user.
 *
 * Use this for all authenticated reads/writes — it respects RLS.
 */
export async function createClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // Safe to ignore — middleware will refresh the session.
          }
        },
      },
    },
  );
}

/**
 * Service-role client — bypasses RLS.
 * ONLY for use in `app/api/cron/*` routes, gated by `CRON_SECRET`.
 * Never expose this to the client.
 */
export function createServiceClient(): SupabaseClient {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }
  // Lazy-import to keep it out of any client bundle
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient: createServiceRoleClient } = require("@supabase/supabase-js");
  return createServiceRoleClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

/**
 * Get the authenticated user's email, server-side.
 * Used to enforce the `ALLOWED_USER_EMAIL` allowlist on every request.
 *
 * Returns `null` if no session, throws if session exists but email is not allowlisted.
 */
export async function getAllowlistedUser(): Promise<{ id: string; email: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    throw new AuthError("NO_SESSION", "Not authenticated");
  }

  const allowed = process.env.ALLOWED_USER_EMAIL;
  if (allowed && user.email.toLowerCase() !== allowed.toLowerCase()) {
    throw new AuthError("FORBIDDEN", `${user.email} is not on the allowlist`);
  }

  return { id: user.id, email: user.email };
}

export class AuthError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}
