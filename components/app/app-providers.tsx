"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "@/components/ui/toast";

/**
 * AppProviders — wraps the (app) route group with TanStack Query + Toast.
 * Query client is created per-render so each user gets a fresh cache.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000, // 30s — balance freshness vs free-tier DB load
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      <ToastProvider duration={4000} swipeDirection="right">
        {children}
      </ToastProvider>
    </QueryClientProvider>
  );
}
