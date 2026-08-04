import { NextResponse } from "next/server";
import { createClient, getAllowlistedUser, AuthError } from "@/lib/supabase/server";
import { generateFlashcardDeck, generateFlashcardsFromNotes } from "@/lib/llm/omniroute";
import { z } from "zod";
import type { ApiError, ApiSuccess, FlashcardDeck } from "@/lib/types";

const schema = z.object({
  topic: z.string().min(2, "Topic must be at least 2 characters"),
  section: z.enum(["QA", "DILR", "VARC"]),
});

/**
 * POST /api/flashcards/generate — generate a new deck via OmniRoute
 */
export async function POST(request: Request) {
  try {
    let user;
    try {
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

    const body = await request.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<ApiError>(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid payload" } },
        { status: 400 },
      );
    }

    const { topic, section } = parsed.data;
    const supabase = await createClient();

    // Prefer generating from the user's latest AI notes on this topic so the
    // cards reflect the same content; fall back to from-scratch generation.
    const { data: latestNote } = await supabase
      .from("notes")
      .select("content")
      .eq("user_id", user.id)
      .eq("topic", topic)
      .eq("section", section)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    // 1. Generate cards via OmniRoute (with Groq fallback)
    const result = latestNote?.content
      ? await generateFlashcardsFromNotes(topic, section, latestNote.content)
      : await generateFlashcardDeck(topic, section);
    if (!result.ok) {
      return NextResponse.json<ApiError>(
        { error: { code: result.code, message: result.message } },
        { status: 500 },
      );
    }

    const cards = result.data;

    // 2. Save deck
    const { data: deck, error: deckErr } = await supabase
      .from("flashcard_decks")
      .insert({
        user_id: user.id,
        topic,
        section,
        card_count: cards.length,
      })
      .select()
      .single();

    if (deckErr || !deck) {
      console.warn(`[Flashcards] DB save notice (${deckErr?.message ?? "no data"}). Returning generated deck fallback...`);
      const tempDeckId = `temp-deck-${Date.now()}`;
      return NextResponse.json<ApiSuccess<FlashcardDeck>>({
        data: {
          id: tempDeckId,
          userId: user.id,
          topic,
          section,
          cardCount: cards.length,
          cards: cards.map((c, idx) => ({
            id: `temp-card-${idx}`,
            deckId: tempDeckId,
            userId: user.id,
            front: c.front,
            back: c.back,
            hint: c.hint ?? undefined,
            category: c.category ?? "Concept",
            masteryLevel: "new",
            createdAt: new Date().toISOString(),
          })),
          createdAt: new Date().toISOString(),
        },
      });
    }

    // 3. Save flashcards
    const cardRows = cards.map((c) => ({
      deck_id: deck.id,
      user_id: user.id,
      front: c.front,
      back: c.back,
      hint: c.hint ?? null,
      category: c.category ?? "Concept",
      mastery_level: "new",
    }));

    const { data: insertedCards, error: cardErr } = await supabase
      .from("flashcards")
      .insert(cardRows)
      .select();

    if (cardErr) {
      return NextResponse.json<ApiError>(
        { error: { code: "DB_ERROR", message: cardErr.message } },
        { status: 500 },
      );
    }

    return NextResponse.json<ApiSuccess<FlashcardDeck>>({
      data: {
        id: deck.id,
        userId: deck.user_id,
        topic: deck.topic,
        section: deck.section,
        cardCount: deck.card_count,
        cards: insertedCards as never,
        createdAt: deck.created_at,
      },
    });
  } catch (err) {
    return NextResponse.json<ApiError>(
      { error: { code: "SERVER_ERROR", message: err instanceof Error ? err.message : String(err) } },
      { status: 500 },
    );
  }
}
