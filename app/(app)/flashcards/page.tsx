import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { FlashcardsClient } from "@/components/flashcards/flashcards-client";
import type { FlashcardDeck } from "@/lib/types";

/**
 * Flashcards page — server bootstrap.
 */
export default async function FlashcardsPage() {
  const supabase = await createClient();
  const { data: decks } = await supabase
    .from("flashcard_decks")
    .select("*, flashcards(*)")
    .order("created_at", { ascending: false });

  const formatted: FlashcardDeck[] = (decks ?? []).map((d) => ({
    id: d.id,
    userId: d.user_id,
    topic: d.topic,
    section: d.section,
    cardCount: d.card_count,
    cards: (d.flashcards ?? []).map((c: { id: string; deck_id: string; user_id: string; front: string; back: string; hint?: string; category?: string; mastery_level: string; last_reviewed_at?: string; created_at: string }) => ({
      id: c.id,
      deckId: c.deck_id,
      userId: c.user_id,
      front: c.front,
      back: c.back,
      hint: c.hint ?? undefined,
      category: c.category ?? undefined,
      masteryLevel: (c.mastery_level ?? "new") as never,
      lastReviewedAt: c.last_reviewed_at ?? null,
      createdAt: c.created_at,
    })),
    createdAt: d.created_at,
  }));

  return (
    <Suspense fallback={<div className="h-64 bg-black/[0.06] rounded-xl animate-pulse" />}>
      <FlashcardsClient initialDecks={formatted} />
    </Suspense>
  );
}
