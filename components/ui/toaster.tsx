"use client";

import * as React from "react";
import { Toast, ToastTitle, ToastDescription, ToastClose, ToastViewport } from "@/components/ui/toast";

/**
 * useToast — minimal toast state hook.
 * Returns a `toast` function and the rendered toast viewport.
 *
 * Usage:
 *   const { toast, toasts } = useToast();
 *   toast({ title: "Saved", tone: "success" });
 *   // render <Toaster toasts={toasts} /> once at the root
 */

export interface ToastOptions {
  title: string;
  description?: string;
  tone?: "neutral" | "success" | "warning" | "error";
  duration?: number;
}

interface ToastItem extends ToastOptions {
  id: string;
}

const ToastContext = React.createContext<{
  toast: (opts: ToastOptions) => void;
  toasts: ToastItem[];
  dismiss: (id: string) => void;
} | null>(null);

export function ToastStateProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback(
    (opts: ToastOptions) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { ...opts, id }]);
      const duration = opts.duration ?? 4000;
      setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ toast, toasts, dismiss }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    // Graceful fallback — returns a no-op so client code doesn't crash
    return {
      toast: () => {},
      toasts: [] as ToastItem[],
      dismiss: () => {},
    };
  }
  return ctx;
}

export function Toaster() {
  const { toasts, dismiss } = useToast();
  return (
    <>
      {toasts.map((t) => (
        <Toast
          key={t.id}
          tone={t.tone}
          onOpenChange={(open) => {
            if (!open) dismiss(t.id);
          }}
        >
          <div>
            <ToastTitle>{t.title}</ToastTitle>
            {t.description ? <ToastDescription>{t.description}</ToastDescription> : null}
          </div>
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </>
  );
}
