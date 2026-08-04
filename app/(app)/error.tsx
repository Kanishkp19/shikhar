"use client";

import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App boundary caught error:", error);
  }, [error]);

  return (
    <div className="bg-white rounded-[12px] border border-[var(--color-danger)] p-8 text-center space-y-4 my-8 max-w-lg mx-auto shadow-[var(--shadow-1)]">
      <div className="w-12 h-12 rounded-full bg-[var(--color-danger)]/10 text-[var(--color-danger)] flex items-center justify-center mx-auto text-lg font-bold">
        !
      </div>
      <div>
        <h2 className="text-lg font-bold text-[var(--color-ink)]">Something went wrong</h2>
        <p className="text-xs text-[var(--color-ink-muted)] mt-1">
          {error.message || "An unexpected error occurred."}
        </p>
      </div>
      <button
        onClick={reset}
        className="px-5 py-2 bg-[var(--color-primary)] text-white text-xs font-semibold rounded-full hover:opacity-90 active:scale-[0.97] transition-all"
      >
        Try Again
      </button>
    </div>
  );
}
