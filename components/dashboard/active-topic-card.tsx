"use client";

import { useActiveTopicStore } from "@/lib/store/active-topic-store";
import { Play, Sparkles, MessageSquare, BookOpen, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/toaster";

export function ActiveTopicCard() {
  const { activeTopic, activeSession, setActiveSession, setSessionStatus, clearActiveTopic } =
    useActiveTopicStore();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const toggleMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completed: true,
          completedAt: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error("Failed to update task status");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Topic marked as done! Great job 🎯" });
      queryClient.invalidateQueries({ queryKey: ["plan"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["streak"] });
    },
    onError: () => {
      toast({ title: "Couldn't mark topic completed", tone: "error" });
    },
  });

  if (!activeTopic) {
    return (
      <div className="bg-white rounded-[12px] border border-[var(--color-hairline)] p-6 shadow-[var(--shadow-1)] flex flex-col items-center text-center space-y-3 py-8">
        <div className="w-12 h-12 rounded-full bg-black/[0.04] flex items-center justify-center text-[var(--color-ink-muted)]">
          <BookOpen className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-bold text-base text-[var(--color-ink)]">No Active Topic Selected</h3>
          <p className="text-xs text-[var(--color-ink-muted)] mt-1 max-w-sm">
            Pick any topic from the 121-day plan to start a timed session, ask doubts, or generate topper notes.
          </p>
        </div>
        <Link
          href="/plan"
          className="mt-2 inline-flex items-center gap-1.5 bg-[var(--color-primary)] text-white text-xs font-semibold rounded-full px-4 py-2 hover:opacity-90 active:scale-[0.97] transition-all"
        >
          Browse Full Plan
        </Link>
      </div>
    );
  }

  const isRunning = activeSession?.status === "running";

  const handleStartSession = () => {
    if (!activeSession) {
      setActiveSession({
        id: `session-${Date.now()}`,
        topicTitle: activeTopic.title,
        section: activeTopic.section,
        status: "running",
        startedAt: new Date().toISOString(),
        elapsedSeconds: 0,
      });
    } else {
      setSessionStatus("running");
    }
  };

  const sectionColor =
    activeTopic.section === "QA"
      ? "var(--color-accent-teal)"
      : activeTopic.section === "DILR"
      ? "var(--color-accent-purple)"
      : activeTopic.section === "VARC"
      ? "var(--color-accent-orange)"
      : activeTopic.section === "MOCK"
      ? "var(--color-accent-pink)"
      : "var(--color-accent-sky)";

  return (
    <div className="bg-white rounded-[12px] border border-[var(--color-hairline)] p-6 shadow-[var(--shadow-1)] space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.125px] bg-black/[0.04] text-[var(--color-ink-secondary)]">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sectionColor }} />
            {activeTopic.section}
          </span>
          <span className="text-xs text-[var(--color-ink-muted)]">Day {activeTopic.dayNumber}</span>
        </div>

        <Link href="/plan" className="text-xs text-[var(--color-primary)] font-semibold hover:underline">
          Change Topic
        </Link>
      </div>

      <div>
        <h3 className="font-bold text-lg text-[var(--color-ink)] leading-snug">
          {activeTopic.title}
        </h3>
        <p className="text-xs text-[var(--color-ink-muted)] mt-1">
          Planned Duration: {activeTopic.durationMinutes} minutes
        </p>
      </div>

      <div className="flex items-center gap-2 pt-2 flex-wrap">
        {!isRunning && (
          <button
            onClick={handleStartSession}
            className="inline-flex items-center gap-1.5 bg-[var(--color-primary)] text-white text-xs font-semibold rounded-full px-4 py-2 hover:opacity-90 active:scale-[0.97] transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Start Timer Session
          </button>
        )}

        {activeTopic.id && (
          <button
            onClick={() => activeTopic.id && toggleMutation.mutate(activeTopic.id)}
            disabled={toggleMutation.isPending}
            className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-full px-3.5 py-2 hover:bg-emerald-100 active:scale-[0.97] transition-all disabled:opacity-50"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Mark Done
          </button>
        )}

        <Link
          href={`/tutor?topic=${encodeURIComponent(activeTopic.title)}`}
          className="inline-flex items-center gap-1.5 bg-white text-[var(--color-ink)] border border-[var(--color-hairline)] text-xs font-semibold rounded-full px-3.5 py-2 hover:bg-black/[0.02] active:scale-[0.97] transition-all"
        >
          <MessageSquare className="w-3.5 h-3.5 text-[var(--color-ink-muted)]" />
          Ask Tutor About This
        </Link>

        <Link
          href={`/notes?topic=${encodeURIComponent(activeTopic.title)}`}
          className="inline-flex items-center gap-1.5 bg-white text-[var(--color-ink)] border border-[var(--color-hairline)] text-xs font-semibold rounded-full px-3.5 py-2 hover:bg-black/[0.02] active:scale-[0.97] transition-all"
        >
          <Sparkles className="w-3.5 h-3.5 text-[var(--color-primary)]" />
          Generate Notes
        </Link>
      </div>
    </div>
  );
}
