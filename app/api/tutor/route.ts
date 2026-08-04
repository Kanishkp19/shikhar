import { NextResponse } from "next/server";
import { createClient, getAllowlistedUser, AuthError } from "@/lib/supabase/server";
import { tutorMessageSchema, rateLimit } from "@/lib/validation/schemas";
import { tutorChat } from "@/lib/llm/groq";
import { buildTutorSystemPrompt } from "@/lib/llm/prompts";
import { todayISODate } from "@/lib/utils";
import type { ApiError, ApiSuccess, TutorMessage } from "@/lib/types";

/**
 * GET /api/tutor?threadDate=YYYY-MM-DD — list messages for a day.
 * POST /api/tutor — send a message and get an AI reply.
 *
 * Per TRD: tutor uses Groq (Llama 3.3 70B), fast path.
 * Rate-limited: 30 messages per hour per user.
 * On 429/5xx: returns { error: { code: "LLM_BUSY" } }.
 */
export async function GET(request: Request) {
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

  const url = new URL(request.url);
  const threadDate = url.searchParams.get("threadDate") ?? todayISODate();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tutor_messages")
    .select("*")
    .eq("user_id", user.id)
    .eq("thread_date", threadDate)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json<ApiError>(
      { error: { code: "DB_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  return NextResponse.json<ApiSuccess<TutorMessage[]>>({ data: (data ?? []) as TutorMessage[] });
}

export async function POST(request: Request) {
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

  // Rate limit: 30 tutor messages per hour per user
  if (!rateLimit(`tutor:${user.id}`, 30, 60 * 60 * 1000)) {
    return NextResponse.json<ApiError>(
      { error: { code: "RATE_LIMITED", message: "Too many messages. Try again later." } },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const parsed = tutorMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json<ApiError>(
      { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid input" } },
      { status: 400 },
    );
  }

  const today = parsed.data.threadDate ?? todayISODate();

  const supabase = await createClient();

  // Fetch today's tasks to give the LLM context
  const { data: todayTasks } = await supabase
    .from("tasks")
    .select("section, title")
    .eq("user_id", user.id)
    .eq("date", today);

  const todaysTopics =
    (todayTasks ?? []).map((t) => `[${t.section}] ${t.title}`).join("\n") ||
    "No specific tasks scheduled today.";

  // Fetch recent message history (last 10 turns) for context
  const { data: history } = await supabase
    .from("tutor_messages")
    .select("role, content")
    .eq("user_id", user.id)
    .eq("thread_date", today)
    .order("created_at", { ascending: true })
    .limit(10);

  // Save the user's message first
  const { error: saveUserErr } = await supabase.from("tutor_messages").insert({
    user_id: user.id,
    thread_date: today,
    role: "user",
    content: parsed.data.content,
  });

  if (saveUserErr) {
    return NextResponse.json<ApiError>(
      { error: { code: "DB_ERROR", message: saveUserErr.message } },
      { status: 500 },
    );
  }

  // Build the message array for the LLM
  const messages = [
    { role: "system" as const, content: buildTutorSystemPrompt({ todayDate: today, todaysTopics }) },
    ...(history ?? []).map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user" as const, content: parsed.data.content },
  ];

  // Call Groq
  const result = await tutorChat(messages);
  if (!result.ok) {
    return NextResponse.json<ApiError>(
      { error: { code: result.code, message: result.message } },
      { status: result.code === "LLM_BUSY" ? 429 : 502 },
    );
  }

  // Save the assistant's reply
  const { data: saved, error: saveAssistantErr } = await supabase
    .from("tutor_messages")
    .insert({
      user_id: user.id,
      thread_date: today,
      role: "assistant",
      content: result.content,
    })
    .select()
    .single();

  if (saveAssistantErr || !saved) {
    return NextResponse.json<ApiError>(
      { error: { code: "DB_ERROR", message: saveAssistantErr?.message ?? "Failed to save reply" } },
      { status: 500 },
    );
  }

  return NextResponse.json<ApiSuccess<TutorMessage>>({ data: saved as TutorMessage });
}
