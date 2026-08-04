"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalTrigger, ModalClose } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toaster";
import { Plus, Layers, Loader2, Trash2, Search, RotateCw, CheckCircle2, AlertCircle, HelpCircle, ChevronLeft, ChevronRight } from "lucide-react";
import type { FlashcardDeck, Flashcard, NoteSection, SRSStatus } from "@/lib/types";
import { formatShortDate } from "@/lib/utils";

interface Props {
  initialDecks: FlashcardDeck[];
}

/**
 * FlashcardsClient — Spaced Repetition Active Recall Deck Player powered by OmniRoute.
 */
export function FlashcardsClient({ initialDecks }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [topic, setTopic] = React.useState("");
  const [section, setSection] = React.useState<NoteSection>("QA");
  const [activeSection, setActiveSection] = React.useState<"ALL" | NoteSection>("ALL");
  const [activeDeck, setActiveDeck] = React.useState<FlashcardDeck | null>(null);
  const [currentCardIdx, setCurrentCardIdx] = React.useState(0);
  const [isFlipped, setIsFlipped] = React.useState(false);

  const { data: decks = initialDecks, isLoading } = useQuery({
    queryKey: ["flashcard_decks"],
    queryFn: async () => {
      const res = await fetch("/api/flashcards");
      if (!res.ok) throw new Error("Failed to load decks");
      const json = await res.json();
      return json.data as FlashcardDeck[];
    },
    initialData: initialDecks,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/flashcards/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, section }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message ?? "Deck generation failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (data?.data) {
        qc.setQueryData(["flashcard_decks"], (old: FlashcardDeck[] | undefined) => [
          data.data,
          ...(old ?? []),
        ]);
        setActiveDeck(data.data);
        setCurrentCardIdx(0);
        setIsFlipped(false);
      }
      setOpen(false);
      setTopic("");
      toast({ title: "Flashcard Deck generated via OmniRoute", tone: "success" });
    },
    onError: (err: Error) => {
      toast({ title: "Generation failed", description: err.message, tone: "error" });
    },
  });

  const deleteDeckMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/flashcards/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete deck");
      return id;
    },
    onSuccess: (id) => {
      qc.setQueryData(["flashcard_decks"], (old: FlashcardDeck[] | undefined) =>
        old ? old.filter((d) => d.id !== id) : []
      );
      if (activeDeck?.id === id) setActiveDeck(null);
      toast({ title: "Deck deleted", tone: "success" });
    },
  });

  const updateMasteryMutation = useMutation({
    mutationFn: async ({ cardId, masteryLevel }: { cardId: string; masteryLevel: SRSStatus }) => {
      const res = await fetch(`/api/flashcards/${cardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ masteryLevel }),
      });
      if (!res.ok) throw new Error("Failed to update card");
      return { cardId, masteryLevel };
    },
    onSuccess: ({ cardId, masteryLevel }) => {
      if (activeDeck?.cards) {
        const updated = activeDeck.cards.map((c) =>
          c.id === cardId ? { ...c, masteryLevel } : c
        );
        setActiveDeck({ ...activeDeck, cards: updated });
      }
    },
  });

  const filteredDecks = React.useMemo(() => {
    return decks.filter((d) => activeSection === "ALL" || d.section === activeSection);
  }, [decks, activeSection]);

  const currentCard: Flashcard | undefined = activeDeck?.cards?.[currentCardIdx];

  const handleRating = (masteryLevel: SRSStatus) => {
    if (!currentCard) return;
    updateMasteryMutation.mutate({ cardId: currentCard.id, masteryLevel });
    setIsFlipped(false);

    if (activeDeck?.cards && currentCardIdx < activeDeck.cards.length - 1) {
      setCurrentCardIdx((prev) => prev + 1);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-heading-1 text-ink tracking-tight">Active Recall Flashcards</h1>
          <p className="text-body-sm text-ink-muted mt-1">
            Spaced repetition formula decks and concept prompts generated by OmniRoute.
          </p>
        </div>
        <Modal open={open} onOpenChange={setOpen}>
          <ModalTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" /> Generate Deck
            </Button>
          </ModalTrigger>
          <ModalContent className="w-full max-w-lg sm:max-w-xl">
            <ModalHeader>
              <ModalTitle>Generate Flashcard Deck via OmniRoute</ModalTitle>
              <ModalDescription>
                Generates 10–12 active-recall formula & concept flashcards for any CAT topic.
              </ModalDescription>
            </ModalHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="deck-topic">Topic Title</Label>
                <Input
                  id="deck-topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. TSD — Trains, Boats & Relative Speed"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label>Section</Label>
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
                      <Loader2 className="h-4 w-4 animate-spin" /> Generating Deck…
                    </>
                  ) : (
                    "Generate Deck"
                  )}
                </Button>
              </div>
            </div>
          </ModalContent>
        </Modal>
      </header>

      {/* Interactive Active Deck Player View */}
      {activeDeck && activeDeck.cards && activeDeck.cards.length > 0 ? (
        <div className="p-6 border border-hairline rounded-2xl bg-surface space-y-6 shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b border-hairline pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Badge tone={activeDeck.section === "QA" ? "qa" : activeDeck.section === "DILR" ? "dilr" : "varc"}>
                  {activeDeck.section}
                </Badge>
                <h3 className="text-body-md font-bold text-ink">{activeDeck.topic}</h3>
              </div>
              <p className="text-caption text-ink-faint mt-1">
                Card {currentCardIdx + 1} of {activeDeck.cards.length}
              </p>
            </div>
            <Button variant="utility" size="sm" onClick={() => setActiveDeck(null)}>
              Back to All Decks
            </Button>
          </div>

          {/* Interactive Flashcard Container */}
          {currentCard && (
            <div className="space-y-4">
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className={`cursor-pointer min-h-[220px] p-6 rounded-xl border-2 transition-all flex flex-col justify-between select-none ${
                  isFlipped
                    ? "border-[var(--color-primary)] bg-[rgba(0,117,222,0.03)]"
                    : "border-hairline bg-canvas-soft hover:border-ink-muted"
                }`}
              >
                <div className="flex items-center justify-between text-caption text-ink-faint">
                  <span className="font-semibold uppercase tracking-wider text-[10px] text-[var(--color-primary)]">
                    {isFlipped ? "Answer & Derivation" : currentCard.category || "Concept Prompt"}
                  </span>
                  <span className="flex items-center gap-1 text-ink-muted">
                    <RotateCw className="h-3 w-3" /> Click to flip
                  </span>
                </div>

                <div className="my-auto py-4">
                  <p className="text-body-lg font-semibold text-ink leading-relaxed">
                    {isFlipped ? currentCard.back : currentCard.front}
                  </p>
                  {!isFlipped && currentCard.hint && (
                    <p className="text-caption text-ink-muted mt-3 flex items-center gap-1">
                      <HelpCircle className="h-3.5 w-3.5 text-accent-orange" /> Hint: {currentCard.hint}
                    </p>
                  )}
                </div>

                <div className="text-caption text-ink-faint text-right">
                  Status: <span className="font-semibold capitalize text-ink">{currentCard.masteryLevel}</span>
                </div>
              </div>

              {/* Confidence Rating Buttons (Shown on Flip) */}
              <div className="flex items-center justify-between gap-2 pt-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Button
                    variant="utility"
                    size="sm"
                    disabled={currentCardIdx === 0}
                    onClick={() => {
                      setCurrentCardIdx((prev) => Math.max(0, prev - 1));
                      setIsFlipped(false);
                    }}
                  >
                    <ChevronLeft className="h-4 w-4" /> Prev
                  </Button>
                  <Button
                    variant="utility"
                    size="sm"
                    disabled={currentCardIdx === (activeDeck.cards?.length ?? 1) - 1}
                    onClick={() => {
                      setCurrentCardIdx((prev) => Math.min((activeDeck.cards?.length ?? 1) - 1, prev + 1));
                      setIsFlipped(false);
                    }}
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                {isFlipped && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="bg-red-500 hover:bg-red-600 text-white text-xs h-8"
                      onClick={() => handleRating("new")}
                    >
                      <AlertCircle className="h-3.5 w-3.5 mr-1" /> Hard / Again
                    </Button>
                    <Button
                      size="sm"
                      className="bg-amber-500 hover:bg-amber-600 text-white text-xs h-8"
                      onClick={() => handleRating("learning")}
                    >
                      Good
                    </Button>
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
                      onClick={() => handleRating("mastered")}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Mastered
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 flex-wrap pb-2 border-b border-hairline">
        {(["ALL", "QA", "DILR", "VARC"] as const).map((sec) => (
          <button
            key={sec}
            type="button"
            onClick={() => setActiveSection(sec)}
            className={`px-3 py-1.5 rounded-lg text-body-sm font-medium transition-all ${
              activeSection === sec
                ? "bg-[var(--color-primary)] text-white shadow-xs"
                : "bg-black/5 text-ink-muted hover:text-ink hover:bg-black/10"
            }`}
          >
            {sec === "ALL" ? "All Decks" : sec}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : filteredDecks.length === 0 ? (
        <EmptyState
          icon={<Layers className="h-8 w-8" />}
          title="No flashcard decks yet"
          description="Generate active recall decks with OmniRoute for formulas, concepts, and shortcuts."
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Generate Deck
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredDecks.map((deck) => (
            <div
              key={deck.id}
              onClick={() => {
                setActiveDeck(deck);
                setCurrentCardIdx(0);
                setIsFlipped(false);
              }}
              className="p-4 rounded-xl border border-hairline bg-surface hover:shadow-soft transition-all cursor-pointer flex items-start justify-between gap-3 group"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Badge tone={deck.section === "QA" ? "qa" : deck.section === "DILR" ? "dilr" : "varc"}>
                    {deck.section}
                  </Badge>
                  <span className="text-caption text-ink-faint">
                    {deck.cardCount || deck.cards?.length || 10} cards · {formatShortDate(deck.createdAt)}
                  </span>
                </div>
                <h4 className="text-body-md font-semibold text-ink group-hover:text-[var(--color-primary)] transition-colors">
                  {deck.topic}
                </h4>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Delete deck "${deck.topic}"?`)) {
                    deleteDeckMutation.mutate(deck.id);
                  }
                }}
                title="Delete deck"
                className="p-1.5 rounded-md text-ink-faint hover:text-accent-orange-deep hover:bg-black/5 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
