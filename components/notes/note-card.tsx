"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, ChevronRight, Trash2 } from "lucide-react";
import type { Note, NoteSection } from "@/lib/types";
import { formatShortDate } from "@/lib/utils";

const sectionToneMap: Record<NoteSection, "qa" | "dilr" | "varc"> = {
  QA: "qa",
  DILR: "dilr",
  VARC: "varc",
};

/**
 * NoteCard — list item on /notes.
 * Shows topic, section tag, generation date, model used, and delete button.
 * Whole card is clickable (links to /notes/[id]).
 */
export interface NoteCardProps {
  note: Note;
  onDelete?: (id: string) => void;
  isDeleting?: boolean;
}

export function NoteCard({ note, onDelete, isDeleting }: NoteCardProps) {
  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDelete && confirm(`Are you sure you want to delete "${note.topic}"?`)) {
      onDelete(note.id);
    }
  };

  return (
    <Link href={`/notes/${note.id}`} className="block group">
      <Card className="transition-shadow group-hover:shadow-soft">
        <CardContent className="p-4 flex items-start gap-3">
          <div className="shrink-0 h-9 w-9 rounded-md bg-canvas-soft flex items-center justify-center text-ink-muted">
            <FileText className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge tone={sectionToneMap[note.section]}>{note.section}</Badge>
              <span className="text-caption text-ink-faint">
                v{note.version} · {formatShortDate(note.createdAt)}
              </span>
            </div>
            <p className="text-body-md text-ink font-medium truncate">{note.topic}</p>
            <p className="text-caption text-ink-faint mt-0.5">
              via {note.generatedBy === "gemini-2.5-flash" ? "Gemini 2.5 Flash" : "DeepSeek V3"}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0 mt-0.5">
            {onDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                title="Delete note"
                className="p-1.5 rounded-md text-ink-faint hover:text-accent-orange-deep hover:bg-black/5 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            ) : null}
            <ChevronRight className="h-4 w-4 text-ink-faint shrink-0 group-hover:text-ink transition-colors" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
