"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { NoteViewer } from "@/components/notes/note-viewer";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toaster";
import type { Note } from "@/lib/types";

/**
 * NoteViewerClient — wraps the NoteViewer with regenerate logic.
 * Regenerate calls /api/notes/generate with the same topic+section, creating
 * a new version (per TRD: old version is kept, never overwritten).
 */
export function NoteViewerClient({ note }: { note: Note }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [isRegenerating, setIsRegenerating] = React.useState(false);

  const regenerate = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: note.topic, section: note.section }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message ?? "Generation failed");
      }
      return res.json();
    },
    onMutate: () => setIsRegenerating(true),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["notes"] });
      toast({ title: "New version generated", tone: "success" });
      router.push(`/notes/${data.data.id}`);
    },
    onError: (err: Error) => {
      toast({ title: "Regeneration failed", description: err.message, tone: "error" });
    },
    onSettled: () => setIsRegenerating(false),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/notes/${note.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message ?? "Delete failed");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes"] });
      toast({ title: "Note deleted", tone: "success" });
      router.push("/notes");
    },
    onError: (err: Error) => {
      toast({ title: "Delete failed", description: err.message, tone: "error" });
    },
  });

  return (
    <NoteViewer
      note={note}
      onRegenerate={() => regenerate.mutate()}
      isRegenerating={isRegenerating}
      onDelete={() => deleteMutation.mutate()}
      isDeleting={deleteMutation.isPending}
    />
  );
}
