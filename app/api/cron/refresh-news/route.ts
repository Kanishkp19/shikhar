import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyCronSecret } from "@/lib/validation/schemas";
import { summarizeNews } from "@/lib/llm/openrouter";
import { mondayOfWeek } from "@/lib/utils";
import { fetchAndFormatHeadlines } from "@/lib/news/scraper";
import type { ApiError, ApiSuccess } from "@/lib/types";

/**
 * POST /api/cron/refresh-news
 * Invoked weekly by Supabase Edge Function (pg_cron, every Monday 09:00 IST).
 * Gated by CRON_SECRET header.
 *
 * Per TRD:
 * - Scrapes a curated list of official CAT / IIM sources + news sites.
 * - Summarizes via Gemini 2.5 Flash (with DeepSeek fallback).
 * - Inserts into `news_items` with `published_week_of` = Monday of current week.
 */

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const secret = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : request.headers.get("x-cron-secret");
  if (!verifyCronSecret(secret)) {
    return NextResponse.json<ApiError>(
      { error: { code: "UNAUTHORIZED", message: "Missing or invalid CRON_SECRET" } },
      { status: 401 },
    );
  }

  // 1. Fetch raw content from sources using the robust scraper
  const rawHeadlines = await fetchAndFormatHeadlines();

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
    // Strip markdown code fences if present
    const jsonStr = llmResult.content.replace(/^```json\s*|\s*```$/g, "").trim();
    items = JSON.parse(jsonStr);
    if (!Array.isArray(items)) throw new Error("LLM response was not an array");
  } catch (err) {
    return NextResponse.json<ApiError>(
      { error: { code: "LLM_PARSE_ERROR", message: `Failed to parse LLM output: ${err}` } },
      { status: 502 },
    );
  }

  // 4. Insert into news_items
  const weekOf = mondayOfWeek(new Date().toISOString());
  const serviceClient = createServiceClient();

  const rows = items.map((item) => ({
    headline: item.headline,
    summary: item.summary,
    source_url: item.sourceUrl,
    source_name: item.sourceName,
    published_week_of: weekOf,
  }));

  const { error } = await serviceClient.from("news_items").insert(rows);

  if (error) {
    return NextResponse.json<ApiError>(
      { error: { code: "DB_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  return NextResponse.json<ApiSuccess<{
    weekOf: string;
    sourcesChecked: number;
    itemsInserted: number;
    model: string;
  }>>({
    data: {
      weekOf,
      sourcesChecked: 0, // Not tracked individually anymore
      itemsInserted: rows.length,
      model: llmResult.model,
    },
  });
}

export const dynamic = "force-dynamic";
export const maxDuration = 120;
