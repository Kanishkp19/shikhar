import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Auth callback — Supabase redirects here after the user clicks the magic link.
 * Exchange the code for a session, then redirect to the app.
 * If the email is not allowlisted, the session is created but the first
 * authenticated request will reject it (see `getAllowlistedUser`).
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}/`);
}
