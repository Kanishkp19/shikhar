import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyCronSecret } from "@/lib/validation/schemas";
import { sendPush } from "@/lib/push/web-push";
import type { ApiError, ApiSuccess, Task, PushSubscriptionRecord } from "@/lib/types";

/**
 * POST /api/cron/dispatch-reminders
 * Invoked by Supabase Edge Function (pg_cron, every 5 min).
 * Gated by CRON_SECRET header.
 *
 * Per TRD:
 * - For each task scheduled at the current HH:mm that's not yet completed:
 *   send a push notification to that user's subscriptions.
 * - Delete expired push subscriptions (410/404) per TRD error handling.
 * - Per "streak-risk warning": if no task completed by 18:00 local, send a warning.
 */

export async function POST(request: Request) {
  // Auth check
  const authHeader = request.headers.get("authorization");
  const secret = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : request.headers.get("x-cron-secret");
  if (!verifyCronSecret(secret)) {
    return NextResponse.json<ApiError>(
      { error: { code: "UNAUTHORIZED", message: "Missing or invalid CRON_SECRET" } },
      { status: 401 },
    );
  }

  const serviceClient = createServiceClient();
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + istOffset);
  const today = ist.toISOString().split("T")[0]!;
  const currentTime = `${String(ist.getUTCHours()).padStart(2, "0")}:${String(ist.getUTCMinutes()).padStart(2, "0")}`;
  const currentHour = ist.getUTCHours();

  // 1. Find tasks scheduled for right now that aren't completed
  const { data: dueTasks, error: dueErr } = await serviceClient
    .from("tasks")
    .select("*, user_id")
    .eq("date", today)
    .eq("scheduled_time", currentTime)
    .eq("completed", false);

  if (dueErr) {
    return NextResponse.json<ApiError>(
      { error: { code: "DB_ERROR", message: dueErr.message } },
      { status: 500 },
    );
  }

  let notificationsSent = 0;
  let expiredRemoved = 0;

  // Send push for each due task
  for (const task of (dueTasks ?? []) as unknown as (Task & { user_id: string })[]) {
    const { data: subs } = await serviceClient
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", task.user_id);

    for (const sub of (subs ?? []) as unknown as PushSubscriptionRecord[]) {
      const result = await sendPush(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        {
          title: `${task.section} · ${task.title}`,
          body: `Scheduled for ${currentTime}. Tap to start.`,
          url: "/",
        },
      );
      if (result.ok) {
        notificationsSent += 1;
      } else if (result.expired) {
        // Per TRD: delete stale subscriptions
        await serviceClient.from("push_subscriptions").delete().eq("id", sub.id);
        expiredRemoved += 1;
      }
    }
  }

  // 2. Streak-risk warning at 18:00 IST — if user has tasks but none completed
  if (currentHour === 18) {
    const { data: todayTasks } = await serviceClient
      .from("tasks")
      .select("user_id, completed")
      .eq("date", today);

    const byUser = new Map<string, { total: number; completed: number }>();
    for (const t of todayTasks ?? []) {
      const uid = t.user_id as string;
      const entry = byUser.get(uid) ?? { total: 0, completed: 0 };
      entry.total += 1;
      if (t.completed) entry.completed += 1;
      byUser.set(uid, entry);
    }

    for (const [userId, counts] of byUser) {
      if (counts.total > 0 && counts.completed === 0) {
        const { data: subs } = await serviceClient
          .from("push_subscriptions")
          .select("*")
          .eq("user_id", userId);

        for (const sub of (subs ?? []) as unknown as PushSubscriptionRecord[]) {
          const result = await sendPush(
            { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
            {
              title: "Streak at risk",
              body: `You haven't started any of today's ${counts.total} tasks yet. Open Shikhar →`,
              url: "/",
            },
          );
          if (result.ok) notificationsSent += 1;
          else if (result.expired) {
            await serviceClient.from("push_subscriptions").delete().eq("id", sub.id);
            expiredRemoved += 1;
          }
        }
      }
    }
  }

  return NextResponse.json<ApiSuccess<{
    checkedAt: string;
    dueTasksFound: number;
    notificationsSent: number;
    expiredRemoved: number;
  }>>({
    data: {
      checkedAt: ist.toISOString(),
      dueTasksFound: (dueTasks ?? []).length,
      notificationsSent,
      expiredRemoved,
    },
  });
}

export const dynamic = "force-dynamic";
export const maxDuration = 30;
