import { NextResponse } from "next/server";
import { createClient, getAllowlistedUser } from "@/lib/supabase/server";
import type { ApiError, ApiSuccess } from "@/lib/types";

/**
 * DELETE /api/flashcards/[id] — delete a deck and its cards.
 * PATCH /api/flashcards/[id] — update card mastery level.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAllowlistedUser();

  const { id } = await params;
  const supabase = await createClient();
  const { error } = await supabase
    .from("flashcard_decks")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json<ApiError>(
      { error: { code: "DB_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  return NextResponse.json<ApiSuccess<{ id: string }>>({ data: { id } });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAllowlistedUser();

  const { id: cardId } = await params;
  const body = await request.json().catch(() => ({}));
  const { masteryLevel } = body as { masteryLevel: "new" | "learning" | "mastered" };

  if (!["new", "learning", "mastered"].includes(masteryLevel)) {
    return NextResponse.json<ApiError>(
      { error: { code: "INVALID_MASTERY", message: "Invalid mastery level" } },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("flashcards")
    .update({
      mastery_level: masteryLevel,
      last_reviewed_at: new Date().toISOString(),
    })
    .eq("id", cardId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json<ApiError>(
      { error: { code: "DB_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  return NextResponse.json<ApiSuccess<typeof data>>({ data });
}
