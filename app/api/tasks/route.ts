import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAllowlistedUser, AuthError } from "@/lib/supabase/server";
import { todayISODate } from "@/lib/utils";
import type { ApiError, ApiSuccess, Task } from "@/lib/types";

/**
 * GET /api/tasks?date=YYYY-MM-DD
 * Returns tasks for a given date (default: today).
 * Sorted by scheduled_time (nulls last).
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
  const date = url.searchParams.get("date") ?? todayISODate();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", date)
    .order("scheduled_time", { ascending: true, nullsFirst: false });

  if (error) {
    return NextResponse.json<ApiError>(
      { error: { code: "DB_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  return NextResponse.json<ApiSuccess<Task[]>>({ data: (data ?? []) as Task[] });
}

/**
 * PATCH /api/tasks
 * Bulk toggles complete / incomplete on an array of tasks (e.g. mark entire day complete).
 * Body: { taskIds: string[], completed: boolean }
 */
export async function PATCH(request: Request) {
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
  const { bulkTaskToggleSchema } = await import("@/lib/validation/schemas");
  const parsed = bulkTaskToggleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json<ApiError>(
      { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid input" } },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .update({
      completed: parsed.data.completed,
      completed_at: parsed.data.completed ? new Date().toISOString() : null,
    })
    .in("id", parsed.data.taskIds)
    .eq("user_id", user.id)
    .select();

  if (error) {
    return NextResponse.json<ApiError>(
      { error: { code: "DB_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  await supabase.rpc("update_streak", {
    p_user_id: user.id,
    p_completed: parsed.data.completed,
  });

  return NextResponse.json<ApiSuccess<Task[]>>({ data: (data ?? []) as Task[] });
}
