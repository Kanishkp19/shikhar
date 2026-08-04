import { createClient } from "@/lib/supabase/server";
import { ProgressClient } from "@/components/progress/progress-client";

/**
 * Progress page — server-side bootstrap.
 * Loads mocks + tasks for SSR streak computation.
 */
export default async function ProgressPage() {
  const supabase = await createClient();
  
  const [mocksResult, tasksResult] = await Promise.all([
    supabase
      .from("mock_scores")
      .select("*")
      .order("mock_date", { ascending: true }),
    supabase
      .from("tasks")
      .select("date, completed")
      .order("date", { ascending: true }),
  ]);

  const mocks = mocksResult.data ?? [];
  const tasks = tasksResult.data ?? [];

  // Compute streak server-side from tasks
  let currentStreak = 0;
  let longestStreak = 0;
  let totalCompleted = 0;
  
  if (tasks.length > 0) {
    // Group tasks by date
    const tasksByDate = new Map<string, { total: number; completed: number }>();
    for (const t of tasks) {
      const entry = tasksByDate.get(t.date) ?? { total: 0, completed: 0 };
      entry.total += 1;
      if (t.completed) entry.completed += 1;
      tasksByDate.set(t.date, entry);
    }

    const sortedDates = Array.from(tasksByDate.keys()).sort();
    let streak = 0;
    
    for (const date of sortedDates) {
      const dayData = tasksByDate.get(date)!;
      if (dayData.completed > 0) {
        streak += 1;
        longestStreak = Math.max(longestStreak, streak);
        totalCompleted += dayData.completed;
      } else {
        streak = 0;
      }
    }
    currentStreak = streak;
  }

  const streak = {
    currentStreak,
    longestStreak,
    totalCompleted,
    todayCompleted: tasks.filter(t => t.date === new Date().toISOString().split("T")[0] && t.completed).length,
    todayTotal: tasks.filter(t => t.date === new Date().toISOString().split("T")[0]).length,
  };

  return (
    <ProgressClient
      initialMocks={mocks as never}
      initialError={mocksResult.error?.message}
      streak={streak}
    />
  );
}