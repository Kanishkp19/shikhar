import { createClient } from "@/lib/supabase/server";
import { TodayDashboardClient } from "@/components/dashboard/today-dashboard-client";
import { todayISODate, formatShortDate } from "@/lib/utils";

/**
 * Today dashboard — Server Component.
 * Fetches today's tasks + streak info server-side (no client waterfall for first paint,
 * per TRD: "interactive within 1.5s on 4G"). Streams the rest via the client island.
 */
export default async function TodayPage() {
  const supabase = await createClient();
  const today = todayISODate();

  const [tasksResult, { data: mocks }] = await Promise.all([
    supabase.from("tasks").select("*").eq("date", today).order("scheduled_time", { ascending: true, nullsFirst: false }),
    supabase.from("mock_scores").select("overall_percentile"),
  ]);

  const tasks = tasksResult.data ?? [];

  // Compute streak server-side (cheap query)
  const { data: streakRow } = await supabase
    .from("streaks")
    .select("current_streak, longest_streak, total_completed")
    .eq("date", today)
    .single();

  const todayCompleted = tasks.filter((t) => t.completed).length;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-eyebrow text-ink-muted uppercase tracking-wide">
          {formatShortDate(today)}
        </p>
        <h1 className="text-heading-1 text-ink tracking-tight mt-1">Today</h1>
        <p className="text-body-sm text-ink-muted mt-1">
          One summit. One system. 121 days to CAT 2026.
        </p>
      </header>

      <TodayDashboardClient
        initialTasks={tasks as never}
        initialStreak={{
          currentStreak: streakRow?.current_streak ?? 0,
          longestStreak: streakRow?.longest_streak ?? 0,
          totalCompleted: streakRow?.total_completed ?? 0,
          todayCompleted,
          todayTotal: tasks.length,
        }}
        mockCount={mocks?.length ?? 0}
      />
    </div>
  );
}
