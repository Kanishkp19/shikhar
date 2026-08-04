"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { NewsCard } from "@/components/news/news-card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Newspaper, RefreshCw, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";
import type { NewsItem } from "@/lib/types";

interface Props {
  initialItems: NewsItem[];
  initialError?: string;
}

export function NewsClient({ initialItems, initialError }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: items = initialItems, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["news"],
    queryFn: async () => {
      const res = await fetch("/api/news");
      if (!res.ok) throw new Error("Failed to load news");
      const json = await res.json();
      return json.data as NewsItem[];
    },
    initialData: initialItems,
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/news/refresh", { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || "Refresh failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["news"] });
      const count = data.data?.itemsInserted ?? 0;
      if (count > 0) {
        toast({ title: "Refreshed", description: `${count} new digest items added`, tone: "success" });
      } else {
        toast({ title: "No new items", description: "No new CAT/IIM news found at this time", tone: "neutral" });
      }
    },
    onError: (err: Error) => {
      toast({ title: "Refresh failed", description: err.message, tone: "error" });
    },
  });

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-heading-1 text-ink tracking-tight">News & Cutoffs</h1>
          <p className="text-body-sm text-ink-muted mt-1">
            Weekly digest of CAT notifications, IIM cutoffs, and shortlist criteria.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="utility"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label="Reload news list"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Reload
          </Button>
          <Button
            variant="primary"
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
            aria-label="Scrape and summarize fresh CAT/IIM news"
          >
            {refreshMutation.isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Refreshing…
              </>
            ) : (
              <>
                <Newspaper className="h-3.5 w-3.5" />
                Refresh Now
              </>
            )}
          </Button>
        </div>
      </header>

      {initialError ? (
        <div className="text-body-sm text-accent-orange-deep">
          Couldn't load existing digest: {initialError}
        </div>
      ) : null}

      {refreshMutation.isError && (
        <div className="flex items-center gap-2 text-body-sm text-accent-orange-deep bg-accent-orange-deep/10 p-3 rounded-lg">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>Refresh failed: {(refreshMutation.error as Error)?.message}</span>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Newspaper className="h-8 w-8" />}
          title="No digest yet"
          description={
            <>
              The weekly cron runs every Monday. Click "Refresh Now" to fetch the latest
              CAT / IIM updates immediately.
            </>
          }
          action={
            <Button onClick={() => refreshMutation.mutate()} disabled={refreshMutation.isPending}>
              {refreshMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Refreshing…
                </>
              ) : (
                <>
                  <Newspaper className="h-3.5 w-3.5" />
                  Refresh Now
                </>
              )}
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((item) => (
            <NewsCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}