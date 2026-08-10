"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import {
  PenLine,
  Plus,
  Trash2,
  ChevronLeft,
  BookOpen,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { NoteCanvas } from "./note-canvas";
import { GenerateModal } from "./generate-modal";
import type { HandwrittenNote } from "@/lib/types";
import { formatShortDate } from "@/lib/utils";

const SECTION_COLOR: Record<string, string> = {
  QA: "var(--color-accent-teal)",
  DILR: "var(--color-accent-purple)",
  VARC: "var(--color-accent-orange)",
};

export function HandwrittenNotesClient() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const [showModal, setShowModal] = useState(false);
  const [activeNote, setActiveNote] = useState<HandwrittenNote | null>(null);

  // Pre-fill from URL params (coming from Plan page)
  const urlTopic = searchParams.get("topic") ?? "";
  const urlSection = searchParams.get("section") ?? "QA";
  const autoGenerate = searchParams.get("generate") === "1";

  // Auto-open modal when arriving from Plan with ?generate=1
  useEffect(() => {
    if (autoGenerate && urlTopic) {
      setShowModal(true);
    }
  }, [autoGenerate, urlTopic]);

  const { data: notes = [], isLoading, isError } = useQuery<HandwrittenNote[]>({
    queryKey: ["handwritten-notes"],
    queryFn: async () => {
      const res = await fetch("/api/handwritten-notes");
      if (!res.ok) throw new Error("Failed to fetch notes");
      const json = await res.json();
      return json.data as HandwrittenNote[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/handwritten-notes/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error("Delete failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["handwritten-notes"] });
      if (activeNote) setActiveNote(null);
    },
  });

  // ── Note viewer ───────────────────────────────────────────────
  if (activeNote) {
    return (
      <div>
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <button
            onClick={() => setActiveNote(null)}
            className="inline-flex items-center gap-1.5 text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            All Notes
          </button>
          <div className="flex items-center gap-3">
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wide bg-black/[0.04]"
              style={{ color: SECTION_COLOR[activeNote.section] ?? "var(--color-ink-muted)" }}
            >
              {activeNote.section}
            </span>
            <span className="text-xs text-[var(--color-ink-muted)]">
              {formatShortDate(activeNote.createdAt.slice(0, 10))}
            </span>
            <button
              onClick={() => deleteMutation.mutate(activeNote.id)}
              disabled={deleteMutation.isPending}
              className="p-1.5 rounded-full text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Delete note"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Canvas */}
        <NoteCanvas note={activeNote.contentJson} />
      </div>
    );
  }

  // ── Gallery view ──────────────────────────────────────────────
  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <PenLine className="w-5 h-5 text-[var(--color-primary)]" />
            <h1 className="text-xl font-bold text-[var(--color-ink)]">Handwritten Notes</h1>
          </div>
          <p className="text-sm text-[var(--color-ink-muted)] mt-0.5">
            AI-generated revision notes in handwritten style
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-primary)] text-white text-sm font-semibold hover:opacity-90 active:scale-[0.97] transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Generate Notes
        </button>
      </div>

      {/* States */}
      {isLoading && (
        <div className="flex items-center justify-center py-20 gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-[var(--color-primary)]" />
          <span className="text-sm text-[var(--color-ink-muted)]">Loading notes…</span>
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-2 text-red-600 text-sm py-8">
          <AlertCircle className="w-4 h-4" />
          Failed to load handwritten notes.
        </div>
      )}

      {!isLoading && !isError && notes.length === 0 && (
        <div className="text-center py-20">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: "var(--color-canvas-soft)" }}
          >
            <BookOpen className="w-6 h-6 text-[var(--color-ink-muted)]" />
          </div>
          <h3 className="text-base font-semibold text-[var(--color-ink)] mb-1">No notes yet</h3>
          <p className="text-sm text-[var(--color-ink-muted)] mb-6 max-w-xs mx-auto">
            Generate your first handwritten revision note. Pick any CAT topic and the AI will craft
            it for you.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-primary)] text-white text-sm font-semibold hover:opacity-90 transition-all"
          >
            <Plus className="w-4 h-4" />
            Generate First Note
          </button>
        </div>
      )}

      {!isLoading && !isError && notes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.map((note) => (
            <button
              key={note.id}
              onClick={() => setActiveNote(note)}
              className="text-left rounded-2xl border border-[var(--color-hairline)] bg-white hover:border-[var(--color-primary)] hover:shadow-md transition-all p-5 group"
              style={{
                background: `
                  repeating-linear-gradient(
                    transparent, transparent 23px,
                    #e8f0fd 23px, #e8f0fd 24px
                  )
                `,
                fontFamily: "var(--font-caveat), cursive",
              }}
            >
              {/* Section badge */}
              <div className="flex items-center justify-between mb-3">
                <span
                  className="text-[11px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                  style={{
                    background: "rgba(0,0,0,0.04)",
                    color: SECTION_COLOR[note.section] ?? "var(--color-ink-muted)",
                  }}
                >
                  {note.section}
                </span>
                <span className="text-[11px] font-sans text-[var(--color-ink-faint)]">
                  {note.contentJson.pages.length}p
                </span>
              </div>

              {/* Title */}
              <h3
                className="text-xl font-bold text-[var(--color-ink)] leading-tight mb-1 group-hover:text-[var(--color-primary)] transition-colors"
                style={{ fontFamily: "var(--font-caveat), cursive" }}
              >
                {note.contentJson.title}
              </h3>
              <p
                className="text-sm text-[var(--color-ink-muted)] mb-3"
                style={{ fontFamily: "var(--font-caveat), cursive" }}
              >
                {note.contentJson.subtitle}
              </p>

              {/* Footer */}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--color-hairline)]">
                <span className="text-[11px] font-sans text-[var(--color-ink-faint)]">
                  {formatShortDate(note.createdAt.slice(0, 10))}
                </span>
                <span className="text-[11px] font-sans font-semibold text-[var(--color-primary)] opacity-0 group-hover:opacity-100 transition-opacity">
                  Open →
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Generate modal */}
      {showModal && (
        <GenerateModal
          initialTopic={urlTopic}
          initialSection={urlSection}
          onClose={() => setShowModal(false)}
          onSuccess={(note) => {
            setShowModal(false);
            setActiveNote(note);
          }}
        />
      )}
    </div>
  );
}
