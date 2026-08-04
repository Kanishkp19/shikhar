"use client";

import * as React from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "shikhar:push-banner-dismissed";

/**
 * PushPermissionBanner — explains why push notifications matter and offers
 * a one-click enable. Per TRD: if permission is denied, the app still works
 * but the banner explains the trade-off (no task-time reminders).
 *
 * Dismissed state is persisted to localStorage so it doesn't nag the user.
 */
export function PushPermissionBanner() {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const perm = Notification.permission;
    const dismissed = localStorage.getItem(DISMISS_KEY) === "1";
    if (perm === "default" && !dismissed) {
      setVisible(true);
    }
  }, []);

  const requestPermission = async () => {
    if (!("Notification" in window)) return;
    await Notification.requestPermission();
    setVisible(false);
    // The actual push subscription registration happens in /settings —
    // we just prime the permission here.
  };

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="bg-surface border-b border-hairline">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-3 flex items-center gap-3">
        <div className="h-9 w-9 rounded-md bg-canvas-soft flex items-center justify-center text-primary shrink-0">
          <Bell className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-body-sm text-ink font-medium">
            Enable push notifications for task-time reminders
          </p>
          <p className="text-caption text-ink-muted">
            We&apos;ll ping you when a scheduled task&apos;s time arrives and warn you if you haven&apos;t started by evening.
          </p>
        </div>
        <Button onClick={requestPermission} size="sm" className="shrink-0">
          Enable
        </Button>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="text-ink-faint hover:text-ink p-1 shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
