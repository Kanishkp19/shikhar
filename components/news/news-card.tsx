"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import type { NewsItem } from "@/lib/types";
import { formatShortDate } from "@/lib/utils";

/**
 * NewsCard — single digest entry on /news.
 * Shows headline, summary, source link.
 * Per TRD: a digest item links back to its source.
 */
export interface NewsCardProps {
  item: NewsItem;
}

export function NewsCard({ item }: NewsCardProps) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-2 gap-2">
          <Badge tone="primary">{item.sourceName}</Badge>
          <span className="text-caption text-ink-faint">
            {formatShortDate(item.publishedWeekOf)}
          </span>
        </div>
        <h3 className="text-title text-ink mb-1.5 font-semibold">{item.headline}</h3>
        <p className="text-body-sm text-ink-secondary leading-relaxed mb-3">
          {item.summary}
        </p>
        <a
          href={item.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-body-sm text-primary hover:underline"
        >
          Read source <ExternalLink className="h-3 w-3 ml-1" />
        </a>
      </CardContent>
    </Card>
  );
}
