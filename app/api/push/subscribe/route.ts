import { NextResponse } from "next/server";
import { createClient, getAllowlistedUser, AuthError } from "@/lib/supabase/server";
import { pushSubscribeSchema } from "@/lib/validation/schemas";
import type { ApiError, ApiSuccess } from "@/lib/types";

/**
 * POST /api/push/subscribe
 * Body: { endpoint: string, keys: { p256dh: string, auth: string } }
 *
 * Saves the browser's push subscription so the cron can dispatch reminders to it.
 * Per TRD: stored per user_id; multiple devices = multiple rows.
 */
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

  const body = await request.json().catch(() => ({}));
  const parsed = pushSubscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json<ApiError>(
      { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid subscription" } },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  // Upsert: same endpoint → update keys (in case browser regenerated them)
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: user.id,
        endpoint: parsed.data.endpoint,
        p256dh: parsed.data.keys.p256dh,
        auth: parsed.data.keys.auth,
      },
      { onConflict: "endpoint" },
    );

  if (error) {
    return NextResponse.json<ApiError>(
      { error: { code: "DB_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  return NextResponse.json<ApiSuccess<{ ok: true }>>({ data: { ok: true } });
}

/**
 * DELETE /api/push/subscribe?endpoint=...
 * Removes a subscription (e.g. user turned off notifications).
 */
export async function DELETE(request: Request) {
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
  const endpoint = url.searchParams.get("endpoint");
  if (!endpoint) {
    return NextResponse.json<ApiError>(
      { error: { code: "VALIDATION_ERROR", message: "endpoint query param required" } },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);

  if (error) {
    return NextResponse.json<ApiError>(
      { error: { code: "DB_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  return NextResponse.json<ApiSuccess<{ ok: true }>>({ data: { ok: true } });
}
