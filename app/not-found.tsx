import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * 404 — friendly fallback per TRD: never a blank screen.
 */
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-canvas-soft">
      <div className="max-w-md text-center">
        <div className="mb-3 h-12 w-12 rounded-md bg-primary flex items-center justify-center text-on-primary font-bold text-title mx-auto">
          श
        </div>
        <h1 className="text-heading-1 text-ink tracking-tight mb-2">Page not found</h1>
        <p className="text-body-sm text-ink-muted mb-6">
          The page you're looking for doesn't exist or has moved.
        </p>
        <Link href="/">
          <Button>Go to Today</Button>
        </Link>
      </div>
    </div>
  );
}
