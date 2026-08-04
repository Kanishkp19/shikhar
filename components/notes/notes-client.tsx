"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { NoteCard } from "@/components/notes/note-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalTrigger, ModalClose } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toaster";
import { Plus, FileText, Loader2, Search, Calculator, BarChart2, BookOpen } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Note, NoteSection } from "@/lib/types";

interface Props {
  initialNotes: Note[];
  initialError?: string;
}

type TabType = "ALL" | NoteSection;

const sectionTitles: Record<NoteSection, { title: string; subtitle: string; icon: React.ReactNode }> = {
  QA: {
    title: "Quantitative Aptitude (QA)",
    subtitle: "Arithmetic, Algebra, Geometry, Modern Math & Number System",
    icon: <Calculator className="h-4 w-4 text-[var(--color-primary)]" />,
  },
  DILR: {
    title: "Data Interpretation & Logical Reasoning (DILR)",
    subtitle: "Arrangements, Tables, Graphs, Games & Tournament Sets",
    icon: <BarChart2 className="h-4 w-4 text-[var(--color-accent-purple)]" />,
  },
  VARC: {
    title: "Verbal Ability & Reading Comprehension (VARC)",
    subtitle: "RC Passages, Para Summary, Para Jumbles & Odd Sentence",
    icon: <BookOpen className="h-4 w-4 text-[var(--color-accent-green)]" />,
  },
};

/**
 * NotesClient — categorized notes by QA, DILR, VARC with deletion and generation.
 */
export function NotesClient({ initialNotes, initialError }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [topic, setTopic] = React.useState("");
  const [section, setSection] = React.useState<NoteSection>("QA");
  const [activeTab, setActiveTab] = React.useState<TabType>("ALL");
  const [searchQuery, setSearchQuery] = React.useState("");

  // Read URL search params (e.g. /notes?topic=...&section=...)
  React.useEffect(() => {
    const topicParam = searchParams.get("topic");
    const sectionParam = searchParams.get("section") as NoteSection | null;
    if (topicParam) {
      setTopic(topicParam);
      if (sectionParam && ["QA", "DILR", "VARC"].includes(sectionParam)) {
        setSection(sectionParam);
        setActiveTab(sectionParam);
      }
      setOpen(true);
    }
  }, [searchParams]);

  const { data: notes = initialNotes, isLoading } = useQuery({
    queryKey: ["notes"],
    queryFn: async () => {
      const res = await fetch("/api/notes");
      if (!res.ok) throw new Error("Failed to load notes");
      const json = await res.json();
      return json.data as Note[];
    },
    initialData: initialNotes,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, section }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message ?? "Generation failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["notes"] });
      qc.invalidateQueries({ queryKey: ["mindmaps"] });
      qc.invalidateQueries({ queryKey: ["flashcard_decks"] });
      setOpen(false);
      setTopic("");
      toast({
        title: "Notes generated",
        description: `${topic} — mindmap & flashcards created from these notes too`,
        tone: "success",
      });
      router.push(`/notes/${data.data.id}`);
    },
    onError: (err: Error) => {
      toast({
        title: "Generation failed",
        description: err.message,
        tone: "error",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notes/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message ?? "Failed to delete note");
      }
      return id;
    },
    onSuccess: (deletedId) => {
      qc.setQueryData(["notes"], (old: Note[] | undefined) =>
        old ? old.filter((n) => n.id !== deletedId) : []
      );
      toast({ title: "Note deleted", tone: "success" });
    },
    onError: (err: Error) => {
      toast({
        title: "Delete failed",
        description: err.message,
        tone: "error",
      });
    },
  });

  // Calculate section counts
  const counts = React.useMemo(() => {
    const qa = notes.filter((n) => n.section === "QA").length;
    const dilr = notes.filter((n) => n.section === "DILR").length;
    const varc = notes.filter((n) => n.section === "VARC").length;
    return { ALL: notes.length, QA: qa, DILR: dilr, VARC: varc };
  }, [notes]);

  // Filter notes by active tab & search query
  const filteredNotes = React.useMemo(() => {
    return notes.filter((n) => {
      const matchesTab = activeTab === "ALL" || n.section === activeTab;
      const matchesSearch =
        !searchQuery.trim() ||
        n.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.section.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [notes, activeTab, searchQuery]);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-heading-1 text-ink tracking-tight">Notes & Revision</h1>
          <p className="text-body-sm text-ink-muted mt-1">
            Categorized by Quant (QA), DILR, and VARC. Topper-style notes saved and searchable.
          </p>
        </div>
        <Modal open={open} onOpenChange={setOpen}>
          <ModalTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" /> Generate notes
            </Button>
          </ModalTrigger>
          <ModalContent className="w-full max-w-lg sm:max-w-xl">
            <ModalHeader>
              <ModalTitle>Generate CAT Topper Notes</ModalTitle>
              <ModalDescription>
                Generates exhaustive 15–20 page notes using the CAT Notes Skill prompt on Gemini 2.5 Flash / DeepSeek.
              </ModalDescription>
            </ModalHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="topic">Topic Title</Label>
                <Input
                  id="topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. TSD — trains, boats, relative speed"
                  className="w-full"
                  autoFocus
                />
                {searchParams.get("topic") && (
                  <p className="text-[11px] text-[var(--color-primary)] font-medium mt-1">
                    ✓ Pre-filled from your curriculum selection
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="section">Section</Label>
                <div className="flex gap-2">
                  {(["QA", "DILR", "VARC"] as NoteSection[]).map((s) => (
                    <Button
                      key={s}
                      type="button"
                      variant={section === s ? "primary" : "utility"}
                      onClick={() => setSection(s)}
                      size="sm"
                    >
                      {s}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <ModalClose asChild>
                  <Button variant="utility">Cancel</Button>
                </ModalClose>
                <Button
                  onClick={() => generateMutation.mutate()}
                  disabled={!topic.trim() || generateMutation.isPending}
                >
                  {generateMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Generating Notes…
                    </>
                  ) : (
                    "Generate Notes"
                  )}
                </Button>
              </div>
            </div>
          </ModalContent>
        </Modal>
      </header>

      {/* Section Filter Tabs & Search Bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-hairline">
        <div className="flex items-center gap-1.5 flex-wrap">
          {(["ALL", "QA", "DILR", "VARC"] as TabType[]).map((tab) => {
            const count = counts[tab];
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-body-sm font-medium transition-all flex items-center gap-1.5 ${
                  isActive
                    ? "bg-[var(--color-primary)] text-white shadow-xs"
                    : "bg-black/5 text-ink-muted hover:text-ink hover:bg-black/10"
                }`}
              >
                <span>{tab === "ALL" ? "All Notes" : tab}</span>
                <span
                  className={`text-[11px] px-1.5 py-0.2 rounded-full font-semibold ${
                    isActive ? "bg-white/20 text-white" : "bg-black/10 text-ink-muted"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 min-w-0 w-full sm:w-auto sm:min-w-[220px]">
          <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes..."
            className="pl-8 text-body-sm h-8 w-full"
          />
        </div>
      </div>

      {initialError ? (
        <div className="text-body-sm text-accent-orange-deep">
          Couldn't load existing notes: {initialError}
        </div>
      ) : null}

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : filteredNotes.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-8 w-8" />}
          title={searchQuery ? "No matching notes found" : `No ${activeTab === "ALL" ? "" : activeTab} notes yet`}
          description={
            searchQuery
              ? `No notes match "${searchQuery}". Try a different topic search.`
              : `Generate your first set of topper-style ${activeTab === "ALL" ? "" : activeTab} notes.`
          }
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Generate notes
            </Button>
          }
        />
      ) : activeTab === "ALL" && !searchQuery ? (
        /* Grouped by Section (QA, DILR, VARC) when viewing All Notes */
        <div className="space-y-8">
          {(["QA", "DILR", "VARC"] as NoteSection[]).map((sec) => {
            const secNotes = notes.filter((n) => n.section === sec);
            if (secNotes.length === 0) return null;
            const meta = sectionTitles[sec];

            return (
              <section key={sec} className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-hairline/60">
                  <div className="flex items-center gap-2">
                    {meta.icon}
                    <div>
                      <h2 className="text-body-md font-bold text-ink">{meta.title}</h2>
                      <p className="text-caption text-ink-faint">{meta.subtitle}</p>
                    </div>
                  </div>
                  <span className="text-caption font-semibold px-2 py-0.5 rounded-full bg-black/5 text-ink-muted">
                    {secNotes.length} note{secNotes.length > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="space-y-2.5">
                  {secNotes.map((n) => (
                    <NoteCard
                      key={n.id}
                      note={n}
                      onDelete={(id) => deleteMutation.mutate(id)}
                      isDeleting={deleteMutation.isPending}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        /* Single Section Tab or Search View */
        <div className="space-y-2.5">
          {filteredNotes.map((n) => (
            <NoteCard
              key={n.id}
              note={n}
              onDelete={(id) => deleteMutation.mutate(id)}
              isDeleting={deleteMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}
