"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Smartphone, Info } from "lucide-react";
import { useToast } from "@/components/ui/toaster";

/**
 * SettingsClient — user can manually enable/disable push notifications here.
 * On enable: requests Notification permission, then subscribes via service worker
 *            and POSTs the subscription to /api/push/subscribe.
 * On disable: future versions would unsubscribe — for now we just show status.
 */
export function SettingsClient() {
  const { toast } = useToast();
  const [permission, setPermission] = React.useState<NotificationPermission | "default">("default");
  const [subscribing, setSubscribing] = React.useState(false);

  React.useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const subscribe = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      toast({
        title: "Push not supported",
        description: "Your browser doesn't support web push notifications.",
        tone: "warning",
      });
      return;
    }

    setSubscribing(true);
    try {
      // 1. Request notification permission
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        toast({
          title: "Permission denied",
          description: "You can enable notifications later from your browser settings.",
          tone: "warning",
        });
        return;
      }

      // 2. Get the public VAPID key from the server
      const vapidRes = await fetch("/api/push/vapid");
      if (!vapidRes.ok) throw new Error("Couldn't fetch VAPID key");
      const { vapidPublicKey } = await vapidRes.json();

      // 3. Register the service worker and subscribe
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      // 4. POST subscription to server
      const sub = subscription.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys!.p256dh,
            auth: sub.keys!.auth,
          },
        }),
      });
      if (!res.ok) throw new Error("Failed to save subscription");

      toast({ title: "Push notifications enabled", tone: "success" });
    } catch (err) {
      toast({
        title: "Couldn't enable push",
        description: err instanceof Error ? err.message : "Unknown error",
        tone: "error",
      });
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-heading-1 text-ink tracking-tight">Settings</h1>
        <p className="text-body-sm text-ink-muted mt-1">
          Manage notifications and view your setup.
        </p>
      </header>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            {permission === "granted" ? (
              <Bell className="h-5 w-5 text-accent-green" />
            ) : (
              <BellOff className="h-5 w-5 text-ink-faint" />
            )}
            <CardTitle>Push notifications</CardTitle>
          </div>
          <CardDescription>
            Get reminded when a scheduled task's time arrives, and a warning if you
            haven't started today's tasks by evening.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-body-sm">
              <p className="text-ink-secondary">
                Status:{" "}
                <span className={
                  permission === "granted" ? "text-accent-green font-medium" :
                  permission === "denied" ? "text-accent-orange-deep font-medium" :
                  "text-ink-muted"
                }>
                  {permission === "granted" ? "Enabled" : permission === "denied" ? "Blocked in browser" : "Not enabled"}
                </span>
              </p>
              {permission === "denied" ? (
                <p className="text-caption text-ink-faint mt-1">
                  To re-enable, reset notification permissions in your browser's site settings.
                </p>
              ) : null}
            </div>
            <Button onClick={subscribe} disabled={subscribing || permission === "granted"}>
              {permission === "granted" ? "Already enabled" : subscribing ? "Enabling…" : "Enable push"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            <CardTitle>Install as PWA</CardTitle>
          </div>
          <CardDescription>
            Add Shikhar to your home screen for a native-app feel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-body-sm text-ink-secondary">
            On Chrome / Edge: click the install icon in the address bar.
            On Safari (iOS): tap the Share button → "Add to Home Screen".
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-ink-muted" />
            <CardTitle>About Shikhar</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-body-sm text-ink-secondary">
            One summit. One system. 121 days. A personal CAT 2026 prep companion
            running entirely on free-tier infrastructure.
          </p>
          <ul className="text-caption text-ink-faint mt-3 space-y-1">
            <li>• Daily plan tracking with streaks</li>
            <li>• AI tutor (Llama 3.3 70B via Groq) — sub-2s replies</li>
            <li>• Topper-style notes (Gemini 2.5 Flash via OpenRouter, DeepSeek fallback)</li>
            <li>• Web Push reminders (VAPID, no third-party service)</li>
            <li>• Weekly CAT / IIM news digest (Supabase Edge Function + pg_cron)</li>
            <li>• Mock score logging with percentile trend charts</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

// Convert base64 VAPID key to Uint8Array (required by PushManager.subscribe)
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = typeof window !== "undefined" ? window.atob(base64) : Buffer.from(base64, "base64").toString("binary");
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}
