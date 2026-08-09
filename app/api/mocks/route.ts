import { NextResponse } from "next/server";
import { createClient, getAllowlistedUser } from "@/lib/supabase/server";
import { mockScoreCreateSchema } from "@/lib/validation/schemas";
import type { ApiError, ApiSuccess, MockScore } from "@/lib/types";

/**
 * GET /api/mocks — list user's mock scores, oldest first.
 * POST /api/mocks — log a new mock score with sectional breakdown.
 */
export async function GET() {
  const user = await getAllowlistedUser();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("mock_scores")
    .select("*")
    .eq("user_id", user.id)
    .order("mock_date", { ascending: true });

  if (error) {
    return NextResponse.json<ApiError>(
      { error: { code: "DB_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  return NextResponse.json<ApiSuccess<MockScore[]>>({ data: (data ?? []) as MockScore[] });
}

export async function POST(request: Request) {
  const user = await getAllowlistedUser();

  const body = await request.json().catch(() => ({}));
  const parsed = mockScoreCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json<ApiError>(
      { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid input" } },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("mock_scores")
    .insert({
      user_id: user.id,
      mock_date: parsed.data.mockDate,
      mock_name: parsed.data.mockName,
      total_score: parsed.data.totalScore,
      overall_percentile: parsed.data.overallPercentile,
      varc_score: parsed.data.varcScore,
      varc_percentile: parsed.data.varcPercentile,
      dilr_score: parsed.data.dilrScore,
      dilr_percentile: parsed.data.dilrPercentile,
      qa_score: parsed.data.qaScore,
      qa_percentile: parsed.data.qaPercentile,
      notes: parsed.data.notes ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json<ApiError>(
      { error: { code: "DB_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  return NextResponse.json<ApiSuccess<MockScore>>({ data: data as MockScore });
}
