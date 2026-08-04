/**
 * Shikhar — Web Push (VAPID) server-side helper
 * Uses the `web-push` npm package to handle VAPID signing + the per-browser
 * push-service protocol. No hand-rolled HTTP — the library handles FCM, Mozilla, etc.
 *
 * Server-only. Never import from a client component.
 */

import webpush from "web-push";
import type { PushSubscriptionRecord } from "@/lib/types";

let configured = false;

function ensureConfigured() {
  if (configured) return;
  if (
    !process.env.VAPID_PUBLIC_KEY ||
    !process.env.VAPID_PRIVATE_KEY ||
    !process.env.VAPID_SUBJECT
  ) {
    throw new Error(
      "VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT must be set in env",
    );
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
  configured = true;
}

/**
 * Public VAPID key — safe to expose to the browser (used during subscription).
 * Returns the key as a base64 string; the browser converts via `urlBase64ToUint8Array`.
 */
export function getVapidPublicKey(): string {
  return process.env.VAPID_PUBLIC_KEY ?? "";
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

/**
 * Send a single push notification to one subscription.
 * Per TRD: if the subscription has expired (410/404), the caller deletes the row.
 *
 * Returns:
 *  - `{ ok: true }` on success
 *  - `{ ok: false, expired: true }` on 410/404 (caller should delete the row)
 *  - `{ ok: false, expired: false, message }` on other errors
 */
export async function sendPush(
  subscription: Pick<PushSubscriptionRecord, "endpoint" | "p256dh" | "auth">,
  payload: PushPayload,
): Promise<{ ok: true } | { ok: false; expired: boolean; message: string }> {
  ensureConfigured();

  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: { p256dh: subscription.p256dh, auth: subscription.auth },
  };

  try {
    await webpush.sendNotification(
      pushSubscription,
      JSON.stringify(payload),
    );
    return { ok: true };
  } catch (err) {
    if (err instanceof webpush.WebPushError) {
      // 410 Gone or 404 Not Found → subscription no longer valid
      if (err.statusCode === 410 || err.statusCode === 404) {
        return { ok: false, expired: true, message: `Subscription expired (${err.statusCode})` };
      }
      return {
        ok: false,
        expired: false,
        message: `WebPushError ${err.statusCode}: ${err.message}`,
      };
    }
    return { ok: false, expired: false, message: String(err) };
  }
}
