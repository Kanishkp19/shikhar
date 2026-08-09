import { NextResponse } from "next/server";
import { createServiceClient, getAllowlistedUser } from "@/lib/supabase/server";
import { summarizeNews } from "@/lib/llm/openrouter";
import { mondayOfWeek } from "@/lib/utils";
import { fetchAndFormatHeadlines } from "@/lib/news/scraper";
import type { ApiError, ApiSuccess } from "@/lib/types";

/**
 * POST /api/news/refresh
 * Manual trigger for news scraping & summarization.
 * Rate-limited to prevent abuse (max 3/hour per user).
 * Returns the newly inserted items.
 */

const RATE_LIMIT_KEY = "news:refresh";
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkRateLimit(userId: string): boolean {
  // Simple in-memory rate limit (for single-instance deployments)
  // In production, use Redis or Supabase for distributed rate limiting
  const key = `${RATE_LIMIT_KEY}:${userId}`;
  const now = Date.now();

  // @ts-expect-error - global cache for rate limiting
  if (!global.__newsRateLimit) global.__newsRateLimit = new Map();
  // @ts-expect-error - global cache for rate limiting
  const store = global.__newsRateLimit as Map<string, number[]>;

  const timestamps = store.get(key) ?? [];
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (recent.length >= RATE_LIMIT_MAX) {
    return false;
  }

  recent.push(now);
  store.set(key, recent);
  return true;
}

export async function POST(_request: Request) {
  try {
    const user = await getAllowlistedUser();

    // Rate limit
    if (!checkRateLimit(user.id)) {
      return NextResponse.json<ApiError>(
        { error: { code: "RATE_LIMITED", message: "Too many refresh requests. Try again later." } },
        { status: 429 },
      );
    }

    // 1. Fetch raw headlines from all sources
    const rawHeadlines = await fetchAndFormatHeadlines();

    if (!rawHeadlines.trim()) {
      return NextResponse.json<ApiError>(
        { error: { code: "NO_SOURCES", message: "No headlines fetched from any source" } },
        { status: 502 },
      );
    }

    // 2. Summarize via LLM
    const llmResult = await summarizeNews(rawHeadlines);
    if (!llmResult.ok) {
      return NextResponse.json<ApiError>(
        { error: { code: llmResult.code, message: llmResult.message } },
        { status: 502 },
      );
    }

    // 3. Parse JSON response
    let items: Array<{ headline: string; summary: string; sourceUrl: string; sourceName: string }>;
    try {
      const jsonStr = llmResult.content.replace(/^```json\s*|\s*```$/g, "").trim();
      items = JSON.parse(jsonStr);
      if (!Array.isArray(items)) throw new Error("LLM response was not an array");
    } catch (err) {
      return NextResponse.json<ApiError>(
        { error: { code: "LLM_PARSE_ERROR", message: `Failed to parse LLM output: ${err}` } },
        { status: 502 },
      );
    }

    if (items.length === 0) {
      return NextResponse.json<ApiSuccess<{ message: string }>>({
        data: { message: "No relevant CAT/IIM news found in current sources" },
      });
    }

    // 4. Insert into news_items (uses service client to bypass insert RLS)
    const weekOf = mondayOfWeek(new Date().toISOString());
    const supabase = createServiceClient();

    const rows = items.map((item) => ({
      headline: item.headline,
      summary: item.summary,
      source_url: item.sourceUrl,
      source_name: item.sourceName,
      published_week_of: weekOf,
    }));

    const { error } = await supabase.from("news_items").insert(rows);

    if (error) {
      return NextResponse.json<ApiError>(
        { error: { code: "DB_ERROR", message: error.message } },
        { status: 500 },
      );
    }

    // 5. Return the new items for immediate UI update
    const { data: newItems } = await supabase
      .from("news_items")
      .select("*")
      .in("source_url", rows.map((r) => r.source_url))
      .eq("published_week_of", weekOf)
      .order("created_at", { ascending: false });

    return NextResponse.json<ApiSuccess<{
      weekOf: string;
      itemsInserted: number;
      items: typeof newItems;
      model: string;
    }>>({
      data: {
        weekOf,
        itemsInserted: rows.length,
        items: newItems ?? [],
        model: llmResult.model,
      },
    });
  } catch (err) {
    console.error("Unhandled error in /api/news/refresh:", err);
    return NextResponse.json<ApiError>(
      { error: { code: "SERVER_ERROR", message: err instanceof Error ? err.message : "Internal Server Error" } },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
export const maxDuration = 120;