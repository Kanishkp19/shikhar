import { NextResponse } from "next/server";
import { createClient, getAllowlistedUser, AuthError } from "@/lib/supabase/server";
import { taskToggleSchema } from "@/lib/validation/schemas";
import type { ApiError, ApiSuccess, Task } from "@/lib/types";

/**
 * PATCH /api/tasks/[id]
 * Toggles complete / incomplete on a single task.
 * Body: { completed: boolean, completedAt?: string | null }
 *
 * On completion: also upserts the streak row (current_streak logic handled
 * server-side via a Postgres function — see 0003_functions.sql).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = taskToggleSchema.safeParse(body);
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
      completed_at: parsed.data.completedAt ?? null,
    })
    .eq("id", id)
    .eq("user_id", user.id) // RLS double-check
    .select()
    .single();

  if (error) {
    return NextResponse.json<ApiError>(
      { error: { code: "DB_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  // Update streak (cheap server-side call; function handles upsert)
  await supabase.rpc("update_streak", {
    p_user_id: user.id,
    p_completed: parsed.data.completed,
  });

  return NextResponse.json<ApiSuccess<Task>>({ data: data as Task });
}
