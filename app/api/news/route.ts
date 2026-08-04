import { NextResponse } from "next/server";
import { createClient, getAllowlistedUser, AuthError } from "@/lib/supabase/server";
import type { ApiError, ApiSuccess, NewsItem } from "@/lib/types";

/**
 * GET /api/news — list latest digest items, newest first.
 * Per TRD: cursor-paginated at 20 items.
 */
export async function GET(request: Request) {
  let user;
  try {
    // Even though news is global, we still require auth — no anonymous access.
    user = await getAllowlistedUser();
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json<ApiError>(
        { error: { code: e.code, message: e.message } },
        { status: e.code === "FORBIDDEN" ? 403 : 401 },
      );
    }
    throw e;
  }

  void user; // user is authenticated; news table is global (no user_id)

  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor");
  const limit = Number(url.searchParams.get("limit") ?? "20");

  const supabase = await createClient();
  let query = supabase
    .from("news_items")
    .select("*")
    .order("published_week_of", { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.lt("published_week_of", cursor);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json<ApiError>(
      { error: { code: "DB_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  return NextResponse.json<ApiSuccess<NewsItem[]>>({ data: (data ?? []) as NewsItem[] });
}
