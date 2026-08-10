import { NextResponse } from "next/server";
import { createClient, getAllowlistedUser } from "@/lib/supabase/server";
import type { ApiError, ApiSuccess, HandwrittenNote } from "@/lib/types";

export const dynamic = "force-dynamic";

/** GET /api/handwritten-notes — list all handwritten notes */
export async function GET() {
  const user = await getAllowlistedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("handwritten_notes")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    // Table not yet created — return empty list instead of 500
    if (error.code === "42P01" || error.message?.includes("does not exist")) {
      return NextResponse.json<ApiSuccess<HandwrittenNote[]>>({ data: [] });
    }
    return NextResponse.json<ApiError>(
      { error: { code: "DB_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  const notes: HandwrittenNote[] = (data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    topic: row.topic,
    section: row.section,
    contentJson: row.content_json,
    createdAt: row.created_at,
  }));

  return NextResponse.json<ApiSuccess<HandwrittenNote[]>>({ data: notes });
}
