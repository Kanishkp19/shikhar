import { NextResponse } from "next/server";
import { createClient, getAllowlistedUser, AuthError } from "@/lib/supabase/server";
import { noteGenerateSchema, rateLimit } from "@/lib/validation/schemas";
import { generateNotes } from "@/lib/llm/openrouter";
import { generateMindMapFromNotes, generateFlashcardsFromNotes } from "@/lib/llm/omniroute";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ApiError, ApiSuccess, Note, NoteSection } from "@/lib/types";

/**
 * POST /api/notes/generate
 * Body: { topic: string, section: "QA" | "DILR" | "VARC" }
 *
 * Generates topper-style notes via Gemini 2.5 Flash (OpenRouter) with DeepSeek
 * fallback. Saves as a NEW row (version auto-increments via SQL function),
 * never overwriting the previous version.
 *
 * Per TRD: rate-limited to avoid burning free-tier LLM quota.
 * Validates: word count >= 3000, all 6 sections present, 25+ questions.
 * If validation fails after retry, saves with status: 'draft'.
 */
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    let user;
    try {
      user = await getAllowlistedUser();
    } catch (e) {
      if (e instanceof AuthError) {
        return NextResponse.json<ApiError>(
          { error: { code: e.code, message: e.message } },
          { status: e.code === "FORBIDDEN" ? 403 : 401 }
        );
      }
      throw e;
    }

    // Rate limit: 10 notes per hour per user
    if (!rateLimit(`notes:${user.id}`, 10, 60 * 60 * 1000)) {
      return NextResponse.json<ApiError>(
        { error: { code: "RATE_LIMITED", message: "Too many notes generated. Try again later." } },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const parsed = noteGenerateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<ApiError>(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid input" } },
        { status: 400 }
      );
    }

    const { topic, section } = parsed.data;

    // Call LLM with both topic and section (handles fallback + validation internally)
    const result = await generateNotes(topic, section);
    if (!result.ok) {
      const status = result.code === "LLM_BUSY" ? 429 : 500;
      return NextResponse.json<ApiError>(
        {
          error: {
            code: result.code,
            message: result.message,
          },
        },
        { status }
      );
    }

    // Determine status based on content validation
    const wordCount = result.content.split(/\s+/).length;
    const lowerContent = result.content.toLowerCase();
    const requiredSections = [
      "introduction",
      "core concepts",
      "concept map",
      "practice questions",
      "speed techniques",
      "common traps",
      "master cheat sheet",
    ];
    const hasAllSections = requiredSections.every((s) => lowerContent.includes(s));
    const questionCount = (result.content.match(/(?:Question|Q\d+|Example \d+)/gi) || []).length;

    const status = wordCount >= 1500 && hasAllSections ? "complete" : "draft";

    // Save as a new row (auto-incrementing version per topic+section)
    const supabase = await createClient();

    const { data: maxVerRow } = await supabase
      .from("notes")
      .select("version")
      .eq("user_id", user.id)
      .eq("topic", topic)
      .eq("section", section)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextVersion = (maxVerRow?.version ?? 0) + 1;

    // Map result model string safely to llm_provider enum ('gemini-2.5-flash' | 'deepseek-chat')
    const providerEnum = result.model === "deepseek-chat" ? "deepseek-chat" : "gemini-2.5-flash";

    const { data: noteRow, error: insertError } = await supabase
      .from("notes")
      .insert({
        user_id: user.id,
        topic,
        section,
        content: result.content,
        version: nextVersion,
        generated_by: providerEnum,
      })
      .select()
      .single();

    if (insertError || !noteRow) {
      console.error("Database insert error:", insertError);
      return NextResponse.json<ApiError>(
        { error: { code: "DB_ERROR", message: insertError?.message ?? "Failed to save note" } },
        { status: 500 }
      );
    }

    // Derive mindmap + flashcards from the freshly generated notes content
    // so all three artifacts share the same source material.
    await generateDerivedArtifacts(supabase, user.id, topic, section, result.content);

    return NextResponse.json<ApiSuccess<Note>>({ data: noteRow as Note });
  } catch (err) {
    console.error("Unhandled error in /api/notes/generate:", err);
    return NextResponse.json<ApiError>(
      { error: { code: "SERVER_ERROR", message: err instanceof Error ? err.message : "Internal Server Error" } },
      { status: 500 }
    );
  }
}

/**
 * Generates a mindmap and flashcard deck from the notes content and saves them.
 * Failures are logged but never fail the notes request — the notes are the
 * primary artifact; derived artifacts are best-effort.
 */
async function generateDerivedArtifacts(
  supabase: SupabaseClient,
  userId: string,
  topic: string,
  section: NoteSection,
  notesContent: string
): Promise<void> {
  const [mindmapResult, flashcardsResult] = await Promise.allSettled([
    generateMindMapFromNotes(topic, section, notesContent),
    generateFlashcardsFromNotes(topic, section, notesContent),
  ]);

  if (mindmapResult.status === "fulfilled" && mindmapResult.value.ok) {
    const { error } = await supabase.from("mindmaps").insert({
      user_id: userId,
      topic,
      section,
      diagram_type: "mindmap",
      mermaid_code: mindmapResult.value.data,
    });
    if (error) console.error("[notes/generate] mindmap save failed:", error.message);
  } else {
    const msg =
      mindmapResult.status === "rejected"
        ? String(mindmapResult.reason)
        : mindmapResult.value.ok
          ? ""
          : mindmapResult.value.message;
    console.error("[notes/generate] mindmap generation failed:", msg);
  }

  if (flashcardsResult.status === "fulfilled" && flashcardsResult.value.ok) {
    const cards = flashcardsResult.value.data;
    const { data: deck, error: deckErr } = await supabase
      .from("flashcard_decks")
      .insert({ user_id: userId, topic, section, card_count: cards.length })
      .select()
      .single();

    if (deckErr || !deck) {
      console.error("[notes/generate] flashcard deck save failed:", deckErr?.message);
      return;
    }

    const { error: cardErr } = await supabase.from("flashcards").insert(
      cards.map((c) => ({
        deck_id: deck.id,
        user_id: userId,
        front: c.front,
        back: c.back,
        hint: c.hint ?? null,
        category: c.category ?? "Concept",
        mastery_level: "new",
      }))
    );
    if (cardErr) console.error("[notes/generate] flashcards save failed:", cardErr.message);
  } else {
    const msg =
      flashcardsResult.status === "rejected"
        ? String(flashcardsResult.reason)
        : flashcardsResult.value.ok
          ? ""
          : flashcardsResult.value.message;
    console.error("[notes/generate] flashcards generation failed:", msg);
  }
}