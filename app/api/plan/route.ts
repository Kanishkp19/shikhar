import { NextRequest, NextResponse } from "next/server";
import { createClient, getAllowlistedUser, AuthError } from "@/lib/supabase/server";
import type { ApiError, ApiSuccess } from "@/lib/types";

export interface PlanDayItem {
  day_number: number;
  date: string;
  tasks: Array<{
    id: string;
    section: "QA" | "DILR" | "VARC" | "MOCK" | "REVIEW";
    title: string;
    scheduled_time: string | null;
    duration_minutes: number;
    completed: boolean;
  }>;
}

export async function GET(request: NextRequest) {
  try {
    await getAllowlistedUser();
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json<ApiError>(
        { error: { code: e.code, message: e.message } },
        { status: e.code === "FORBIDDEN" ? 403 : 401 }
      );
    }
    throw e;
  }

  const { searchParams } = new URL(request.url);
  const section = searchParams.get("section");
  const search = searchParams.get("search");

  const supabase = await createClient();

  // Query tasks table
  let query = supabase
    .from("tasks")
    .select("id, date, section, title, scheduled_time, duration_minutes, completed")
    .order("date", { ascending: true })
    .order("scheduled_time", { ascending: true, nullsFirst: false });

  if (section && section !== "ALL") {
    query = query.eq("section", section);
  }

  if (search && search.trim() !== "") {
    query = query.ilike("title", `%${search.trim()}%`);
  }

  const { data: tasks, error } = await query;

  if (error) {
    return NextResponse.json<ApiError>(
      { error: { code: "DB_ERROR", message: error.message } },
      { status: 500 }
    );
  }

  // Group tasks by date / calculate day_number
  const daysMap = new Map<string, Array<NonNullable<typeof tasks>[0]>>();
  (tasks ?? []).forEach((task) => {
    const list = daysMap.get(task.date) ?? [];
    list.push(task);
    daysMap.set(task.date, list);
  });

  const sortedDates = Array.from(daysMap.keys()).sort();
  const startDate = sortedDates[0] ? new Date(sortedDates[0]) : new Date();

  const planDays: PlanDayItem[] = sortedDates.map((dateStr) => {
    const currentDate = new Date(dateStr);
    const diffTime = Math.abs(currentDate.getTime() - startDate.getTime());
    const dayNumber = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    return {
      day_number: dayNumber,
      date: dateStr,
      tasks: (daysMap.get(dateStr) ?? []).map((t) => ({
        id: t.id,
        section: t.section as "QA" | "DILR" | "VARC" | "MOCK" | "REVIEW",
        title: t.title,
        scheduled_time: t.scheduled_time,
        duration_minutes: t.duration_minutes ?? 45,
        completed: t.completed ?? false,
      })),
    };
  });

  return NextResponse.json<ApiSuccess<PlanDayItem[]>>({ data: planDays });
}