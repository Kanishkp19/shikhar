import { createClient } from "@/lib/supabase/server";
import { todayISODate } from "@/lib/utils";
import { TutorClient } from "@/components/tutor/tutor-client";

/**
 * Tutor page — server-side bootstrap.
 * Pre-fetches today's tutor messages + today's task topics so the LLM system
 * prompt can include today's context (per PRD user story #4).
 */
export default async function TutorPage() {
  const supabase = await createClient();
  const today = todayISODate();

  const [messagesResult, tasksResult] = await Promise.all([
    supabase
      .from("tutor_messages")
      .select("*")
      .eq("thread_date", today)
      .order("created_at", { ascending: true }),
    supabase.from("tasks").select("section, title").eq("date", today),
  ]);

  const messages = messagesResult.data ?? [];
  const tasks = tasksResult.data ?? [];
  const todaysTopics = tasks.map((t) => `[${t.section}] ${t.title}`).join("\n") || "No specific tasks scheduled today.";

  return <TutorClient initialMessages={messages as never} todayDate={today} todaysTopics={todaysTopics} />;
}
