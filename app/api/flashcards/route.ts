import { NextResponse } from "next/server";
import { createClient, getAllowlistedUser } from "@/lib/supabase/server";
import type { ApiError, ApiSuccess, FlashcardDeck } from "@/lib/types";

/**
 * GET /api/flashcards — list all flashcard decks for the user.
 */
export async function GET() {
  const user = await getAllowlistedUser();

  const supabase = await createClient();
  const { data: decks, error } = await supabase
    .from("flashcard_decks")
    .select("*, flashcards(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn(`[Flashcards GET] Notice: ${error.message}`);
    return NextResponse.json<ApiSuccess<FlashcardDeck[]>>({ data: [] });
  }

  return NextResponse.json<ApiSuccess<FlashcardDeck[]>>({
    data: (decks ?? []) as unknown as FlashcardDeck[],
  });
}
