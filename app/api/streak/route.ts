import { NextResponse } from "next/server";
import { createClient, getAllowlistedUser, AuthError } from "@/lib/supabase/server";
import { todayISODate } from "@/lib/utils";
import type { ApiError, ApiSuccess, StreakInfo } from "@/lib/types";

/**
 * GET /api/streak — returns the current user's streak info.
 * Pulls today's streak row + recomputes today's progress from tasks table.
 */
export async function GET() {
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

  const today = todayISODate();
  const supabase = await createClient();

  const [streakResult, tasksResult, longestResult] = await Promise.all([
    supabase.from("streaks").select("current_streak, longest_streak, total_completed").eq("date", today).eq("user_id", user.id).single(),
    supabase.from("tasks").select("completed").eq("date", today).eq("user_id", user.id),
    supabase.from("streaks").select("longest_streak, total_completed").eq("user_id", user.id).order("longest_streak", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const todayTasks = tasksResult.data ?? [];
  const todayCompleted = todayTasks.filter((t) => t.completed).length;

  const info: StreakInfo = {
    currentStreak: streakResult.data?.current_streak ?? 0,
    longestStreak: longestResult.data?.longest_streak ?? streakResult.data?.longest_streak ?? 0,
    totalCompleted: longestResult.data?.total_completed ?? streakResult.data?.total_completed ?? 0,
    todayCompleted,
    todayTotal: todayTasks.length,
  };

  return NextResponse.json<ApiSuccess<StreakInfo>>({ data: info });
}
