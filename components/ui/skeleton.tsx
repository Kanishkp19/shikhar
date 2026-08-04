import { cn } from "@/lib/utils";

/**
 * Skeleton — loading placeholder.
 * Uses the canvas-soft background as the shimmer surface so it reads as a
 * "ghost" of the eventual content rather than a gray spinner.
 */
function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xs bg-canvas-soft border border-hairline",
        className,
      )}
      aria-hidden="true"
    />
  );
}

export { Skeleton };
