"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, RefreshCw, Trash2 } from "lucide-react";
import Link from "next/link";
import type { Note, NoteSection } from "@/lib/types";
import { formatShortDate } from "@/lib/utils";

const sectionToneMap: Record<NoteSection, "qa" | "dilr" | "varc"> = {
  QA: "qa",
  DILR: "dilr",
  VARC: "varc",
};

/**
 * NoteViewer — full-page markdown renderer for a single note.
 * Includes a header (topic, section badge, version, generation date) and
 * Regenerate & Delete action buttons.
 */

export interface NoteViewerProps {
  note: Note | null;
  isLoading?: boolean;
  isError?: boolean;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
  onDelete?: () => void;
  isDeleting?: boolean;
}

function cleanNoteContent(rawContent: string): string {
  if (!rawContent) return "";
  return rawContent
    .replace(/\\text\{([^}]+)\}/g, "$1")
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1 / $2)")
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, math) => `\n\`\`\`\n${math.trim()}\n\`\`\`\n`)
    .replace(/\$([^$\n]+)\$/g, (_, math) => `\`${math.trim()}\``)
    .replace(/\\implies/g, "⇒")
    .replace(/\\times/g, "×")
    .replace(/\\cdot/g, "·")
    // Convert inline callout markers to blockquotes for automatic callout card styling
    .replace(/^(\[THE MISTAKE 80% OF STUDENTS MAKE\]:?)/gm, "> ⚠️ **$1**")
    .replace(/^(\[TRAP\]:?)/gm, "> ⚠️ **$1**")
    .replace(/^(\[CAT TRICK\]:?)/gm, "> 💡 **$1**")
    .replace(/^(\[TOPPER INSIGHT\]:?)/gm, "> 🎓 **$1**");
}

export function NoteViewer({
  note,
  isLoading,
  isError,
  onRegenerate,
  isRegenerating,
  onDelete,
  isDeleting,
}: NoteViewerProps) {
  const cleanedContent = React.useMemo(
    () => (note?.content ? cleanNoteContent(note.content) : ""),
    [note?.content]
  );

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-5 w-1/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    );
  }

  if (isError || !note) {
    return (
      <div className="max-w-3xl mx-auto p-6 text-center">
        <p className="text-title text-ink mb-2">Note not found</p>
        <p className="text-body-sm text-ink-muted mb-4">
          This note may have been deleted, or the link is broken.
        </p>
        <Link href="/notes">
          <Button variant="utility">
            <ArrowLeft className="h-4 w-4" /> Back to notes
          </Button>
        </Link>
      </div>
    );
  }

  const handleDelete = () => {
    if (onDelete && confirm(`Are you sure you want to delete "${note.topic}"?`)) {
      onDelete();
    }
  };

  return (
    <article className="max-w-3xl mx-auto p-6">
      <div className="mb-6 pb-6 border-b border-hairline">
        <Link
          href="/notes"
          className="inline-flex items-center text-body-sm text-ink-muted hover:text-ink mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> All notes
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <Badge tone={sectionToneMap[note.section]}>{note.section}</Badge>
              <span className="text-caption text-ink-faint">
                v{note.version} · {formatShortDate(note.createdAt)} · via{" "}
                {note.generatedBy === "gemini-2.5-flash" ? "Gemini 2.5 Flash" : "DeepSeek V3"}
              </span>
            </div>
            <h1 className="text-heading-1 text-ink tracking-tight">{note.topic}</h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onRegenerate ? (
              <Button
                variant="utility"
                onClick={onRegenerate}
                disabled={isRegenerating || isDeleting}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRegenerating ? "animate-spin" : ""}`} />
                {isRegenerating ? "Generating…" : "Regenerate"}
              </Button>
            ) : null}
            {onDelete ? (
              <Button
                variant="utility"
                onClick={handleDelete}
                disabled={isDeleting || isRegenerating}
                className="text-accent-orange-deep hover:bg-black/5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {isDeleting ? "Deleting…" : "Delete"}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
      <div className="prose-shikhar">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            blockquote({ children }) {
              const textContent = React.Children.toArray(children)
                .map((child) => (typeof child === "string" ? child : ""))
                .join(" ");

              let className = "my-4 border-l-4 border-[var(--color-primary)] bg-[rgba(0,117,222,0.04)] p-4 rounded-r-lg";
              if (textContent.includes("TRAP") || textContent.includes("MISTAKE")) {
                className = "callout-trap";
              } else if (textContent.includes("TRICK") || textContent.includes("SPEED")) {
                className = "callout-trick";
              } else if (textContent.includes("INSIGHT")) {
                className = "callout-insight";
              }

              return <blockquote className={className}>{children}</blockquote>;
            },
          }}
        >
          {cleanedContent}
        </ReactMarkdown>
      </div>
    </article>
  );
}
