import { NextResponse } from "next/server";
import { createClient, getAllowlistedUser } from "@/lib/supabase/server";
import { generateHandwrittenNotes } from "@/lib/llm/omniroute";
import type { ApiError, ApiSuccess, HandwrittenNote } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/handwritten-notes/generate
 * Body: { topic: string; section: string }
 * Generates structured handwritten notes via OmniRoute → Groq,
 * saves to the handwritten_notes table, and returns the note.
 */
export async function POST(request: Request) {
  const user = await getAllowlistedUser();

  let topic: string;
  let section: string;

  try {
    const body = await request.json();
    topic = (body.topic ?? "").trim();
    section = (body.section ?? "QA").trim();
    if (!topic) {
      return NextResponse.json<ApiError>(
        { error: { code: "VALIDATION_ERROR", message: "topic is required" } },
        { status: 400 },
      );
    }
  } catch {
    return NextResponse.json<ApiError>(
      { error: { code: "VALIDATION_ERROR", message: "Invalid request body" } },
      { status: 400 },
    );
  }

  // Look up existing notes for this topic — use them as source if available
  const supabase = await createClient();
  let existingNotesContent: string | undefined;

  // Clean topic string: e.g. "Ratio & Proportion — concepts + 25 problems" -> "Ratio & Proportion"
  const rawClean = (topic.split("—")[0] ?? topic).split("-")[0] ?? topic;
  const cleanTopicName = rawClean.trim();
  const keywords = cleanTopicName.replace(/[^\w\s]/gi, " ").split(/\s+/).filter((w) => w.length > 2);
  const primaryKeyword = keywords[0] ?? cleanTopicName;

  // Search strategy 1: ilike with clean topic name
  let { data: existingNotes } = await supabase
    .from("notes")
    .select("content, topic")
    .eq("user_id", user.id)
    .ilike("topic", `%${cleanTopicName}%`)
    .order("created_at", { ascending: false })
    .limit(1);

  // Search strategy 2: ilike with primary keyword if strategy 1 yielded nothing
  if ((!existingNotes || existingNotes.length === 0) && primaryKeyword) {
    const res = await supabase
      .from("notes")
      .select("content, topic")
      .eq("user_id", user.id)
      .ilike("topic", `%${primaryKeyword}%`)
      .order("created_at", { ascending: false })
      .limit(1);
    existingNotes = res.data;
  }

  if (existingNotes && existingNotes.length > 0 && existingNotes[0]) {
    existingNotesContent = existingNotes[0].content as string;
    console.log(`[HW Notes] Found existing notes for "${existingNotes[0].topic}" — using as source material`);
  } else {
    console.log(`[HW Notes] No existing notes for "${topic}" (cleaned: "${cleanTopicName}", keyword: "${primaryKeyword}") — generating from scratch`);
  }

  // Generate structured notes via LLM (with existing notes if available)
  const result = await generateHandwrittenNotes(topic, section, existingNotesContent);
  if (!result.ok) {
    return NextResponse.json<ApiError>(
      { error: { code: result.code, message: result.message } },
      { status: 503 },
    );
  }

  const { data, error } = await supabase
    .from("handwritten_notes")
    .insert({
      user_id: user.id,
      topic,
      section,
      content_json: result.data,
    })
    .select("*")
    .single();

  if (error || !data) {
    const msg = error?.message ?? "Insert failed";
    // Tell user clearly if migration hasn't been run yet
    if (error?.code === "42P01" || msg.includes("does not exist")) {
      return NextResponse.json<ApiError>(
        { error: { code: "MIGRATION_NEEDED", message: "Run the Supabase migration 0004_handwritten_notes.sql first" } },
        { status: 503 },
      );
    }
    return NextResponse.json<ApiError>(
      { error: { code: "DB_ERROR", message: msg } },
      { status: 500 },
    );
  }

  const note: HandwrittenNote = {
    id: data.id,
    userId: data.user_id,
    topic: data.topic,
    section: data.section,
    contentJson: data.content_json,
    createdAt: data.created_at,
  };

  return NextResponse.json<ApiSuccess<HandwrittenNote>>({ data: note }, { status: 201 });
}
