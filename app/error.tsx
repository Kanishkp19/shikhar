"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

/**
 * Error boundary — per TRD: "friendly message + reload action, never a blank screen".
 * Next.js will render this when an uncaught error bubbles up in a route segment.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-canvas-soft flex items-center justify-center text-accent-orange-deep">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="text-heading-2 text-ink mb-2">Something went wrong</h1>
        <p className="text-body-sm text-ink-muted mb-1">
          An unexpected error occurred while loading this page.
        </p>
        {error.digest ? (
          <p className="text-caption text-ink-faint mb-4">Error ID: {error.digest}</p>
        ) : null}
        <div className="flex justify-center gap-2">
          <Button onClick={reset}>Try again</Button>
          <Button variant="utility" onClick={() => window.location.reload()}>
            Reload page
          </Button>
        </div>
      </div>
    </div>
  );
}
