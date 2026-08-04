import { NextResponse } from "next/server";
import { getVapidPublicKey } from "@/lib/push/web-push";
import type { ApiSuccess } from "@/lib/types";

/**
 * GET /api/push/vapid
 * Returns the public VAPID key — safe to expose to the browser (used during
 * push subscription). The private key never leaves the server.
 */
export async function GET() {
  return NextResponse.json<ApiSuccess<{ vapidPublicKey: string }>>({
    data: { vapidPublicKey: getVapidPublicKey() },
  });
}
