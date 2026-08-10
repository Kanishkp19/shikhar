"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Sparkles, Loader2 } from "lucide-react";
import type { HandwrittenNote } from "@/lib/types";

const SECTIONS = [
  { value: "QA", label: "QA — Quant" },
  { value: "DILR", label: "DILR — Data & Reasoning" },
  { value: "VARC", label: "VARC — Verbal" },
];

interface GenerateModalProps {
  initialTopic?: string;
  initialSection?: string;
  onClose: () => void;
  onSuccess: (note: HandwrittenNote) => void;
}

export function GenerateModal({
  initialTopic = "",
  initialSection = "QA",
  onClose,
  onSuccess,
}: GenerateModalProps) {
  const [topic, setTopic] = useState(initialTopic);
  const [section, setSection] = useState(initialSection);
  const queryClient = useQueryClient();

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/handwritten-notes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), section }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message ?? "Generation failed");
      }
      const json = await res.json();
      return json.data as HandwrittenNote;
    },
    onSuccess: (note) => {
      queryClient.invalidateQueries({ queryKey: ["handwritten-notes"] });
      onSuccess(note);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    generateMutation.mutate();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
        style={{ fontFamily: "inherit" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-[var(--color-ink)]">Generate Handwritten Notes</h2>
            <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
              AI-powered revision notes in handwritten style
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/5 text-[var(--color-ink-muted)] transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Topic input */}
          <div>
            <label
              htmlFor="hw-topic"
              className="block text-xs font-semibold text-[var(--color-ink-secondary)] uppercase tracking-wide mb-1.5"
            >
              Topic
            </label>
            <input
              id="hw-topic"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Triangles, Percentages, Time & Work..."
              disabled={generateMutation.isPending}
              className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-hairline)] bg-[var(--color-canvas-soft)] text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-50 transition-shadow"
              autoFocus
            />
          </div>

          {/* Section select */}
          <div>
            <label
              htmlFor="hw-section"
              className="block text-xs font-semibold text-[var(--color-ink-secondary)] uppercase tracking-wide mb-1.5"
            >
              Section
            </label>
            <select
              id="hw-section"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              disabled={generateMutation.isPending}
              className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-hairline)] bg-[var(--color-canvas-soft)] text-sm text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-50"
            >
              {SECTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Error */}
          {generateMutation.isError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {generateMutation.error instanceof Error
                ? generateMutation.error.message
                : "Something went wrong. Please try again."}
            </p>
          )}

          {/* Generate button */}
          <button
            type="submit"
            disabled={generateMutation.isPending || !topic.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-primary)] text-white font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating notes...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Notes
              </>
            )}
          </button>

          {generateMutation.isPending && (
            <p className="text-center text-xs text-[var(--color-ink-muted)]">
              This takes ~20–40 seconds. The LLM is crafting your notes...
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
