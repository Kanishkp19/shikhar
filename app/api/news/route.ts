import { NextResponse } from "next/server";
import { createClient, getAllowlistedUser } from "@/lib/supabase/server";
import type { ApiError, ApiSuccess, NewsItem } from "@/lib/types";

/**
 * GET /api/news — list latest digest items, newest first.
 * Per TRD: cursor-paginated at 20 items.
 */
export async function GET(request: Request) {
  await getAllowlistedUser();

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
