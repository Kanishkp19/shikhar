import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

/**
 * Loading skeleton — per TRD: every screen has a loading state, never a blank screen.
 */
export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-3 w-24 bg-canvas-soft rounded animate-pulse" />
        <div className="h-8 w-32 bg-canvas-soft rounded animate-pulse" />
        <div className="h-4 w-64 bg-canvas-soft rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-surface border border-hairline rounded-lg animate-pulse" />
        ))}
      </div>
      <div className="h-96 bg-surface border border-hairline rounded-lg animate-pulse" />
      <div className="flex justify-center">
        <Button disabled variant="ghost">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </Button>
      </div>
    </div>
  );
}
