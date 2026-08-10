"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Section } from "@/lib/types";
import { useActiveTopicStore } from "@/lib/store/active-topic-store";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/toaster";
import { Clock, CheckCircle2, Sparkles, MessageSquare, PenLine } from "lucide-react";
import Link from "next/link";

interface TopicRowProps {
  id: string;
  dayNumber: number;
  section: Section;
  title: string;
  durationMinutes: number;
  scheduledTime?: string | null;
  completed?: boolean;
  onToggle?: (id: string, completed: boolean) => void;
}

export function TopicRow({
  id,
  dayNumber,
  section,
  title,
  durationMinutes,
  scheduledTime,
  completed = false,
  onToggle,
}: TopicRowProps) {
  const { activeTopic, setActiveTopic } = useActiveTopicStore();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [localCompleted, setLocalCompleted] = useState<boolean | null>(null);
  const isDone = localCompleted ?? completed;

  // Reset local state if prop changes from outside
  useEffect(() => {
    setLocalCompleted(null);
  }, [completed]);

  const isActive = activeTopic?.title === title;

  const toggleMutation = useMutation({
    mutationFn: async (nextState: boolean) => {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completed: nextState,
          completedAt: nextState ? new Date().toISOString() : null,
        }),
      });
      if (!res.ok) throw new Error("Failed to update task status");
      return res.json();
    },
    onMutate: (nextState) => {
      setLocalCompleted(nextState);
    },
    onError: () => {
      setLocalCompleted(null);
      toast({ title: "Couldn't update task status", tone: "error" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["plan"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["streak"] });
    },
  });

  const handleCheckedChange = (checked: boolean) => {
    setLocalCompleted(checked);
    if (onToggle) {
      onToggle(id, checked);
    } else {
      toggleMutation.mutate(checked);
    }
  };

  const sectionColor =
    section === "QA"
      ? "var(--color-accent-teal)"
      : section === "DILR"
      ? "var(--color-accent-purple)"
      : section === "VARC"
      ? "var(--color-accent-orange)"
      : section === "MOCK"
      ? "var(--color-accent-pink)"
      : "var(--color-accent-sky)";

  const handleMakeActive = () => {
    setActiveTopic({
      id,
      dayNumber,
      section,
      title,
      durationMinutes,
      scheduledTime,
    });
  };

  return (
    <div
      className={`rounded-[8px] p-3 border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        isDone
          ? "bg-[var(--color-canvas-soft)]/70 border-[var(--color-hairline)] opacity-85"
          : isActive
          ? "bg-[var(--color-canvas-soft)] border-[var(--color-primary)] ring-1 ring-[var(--color-primary)] shadow-sm"
          : "bg-white border-[var(--color-hairline)] hover:border-black/20"
      }`}
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        {/* Manual completion checkbox */}
        <div className="pt-0.5 shrink-0">
          <Checkbox
            checked={isDone}
            onCheckedChange={(checked) => handleCheckedChange(Boolean(checked))}
            disabled={toggleMutation.isPending}
            aria-label={`Mark "${title}" as ${isDone ? "incomplete" : "complete"}`}
          />
        </div>

        {/* Section Badge */}
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.125px] bg-black/[0.04] text-[var(--color-ink-secondary)] shrink-0 mt-0.5">
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sectionColor }} />
          {section}
        </span>

        <div className="space-y-1 min-w-0">
          <h4
            className={`text-sm font-medium leading-snug cursor-pointer select-none ${
              isDone ? "line-through text-[var(--color-ink-faint)]" : "text-[var(--color-ink)]"
            }`}
            onClick={() => handleCheckedChange(!isDone)}
          >
            {title}
          </h4>
          <div className="flex items-center gap-3 text-[12px] text-[var(--color-ink-muted)]">
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {durationMinutes} mins
            </span>
            {scheduledTime && <span>Scheduled: {scheduledTime}</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
        {/* Action icons */}
        <Link
          href={`/tutor?topic=${encodeURIComponent(title)}`}
          className="p-1.5 rounded-full text-[var(--color-ink-muted)] hover:bg-black/5 hover:text-[var(--color-ink)] transition-all"
          title="Ask Tutor"
        >
          <MessageSquare className="w-4 h-4" />
        </Link>
        <Link
          href={`/notes?topic=${encodeURIComponent(title)}`}
          className="p-1.5 rounded-full text-[var(--color-ink-muted)] hover:bg-black/5 hover:text-[var(--color-ink)] transition-all"
          title="Generate Notes"
        >
          <Sparkles className="w-4 h-4" />
        </Link>
        <Link
          href={`/handwritten-notes?topic=${encodeURIComponent(title)}&section=${encodeURIComponent(section)}&generate=1`}
          className="p-1.5 rounded-full text-[var(--color-ink-muted)] hover:bg-black/5 hover:text-[var(--color-primary)] transition-all"
          title="Generate Handwritten Notes"
        >
          <PenLine className="w-4 h-4" />
        </Link>

        {isDone ? (
          <button
            onClick={() => handleCheckedChange(false)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-all"
            title="Click to mark incomplete"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Done
          </button>
        ) : isActive ? (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--color-primary)] text-white">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Active
          </span>
        ) : (
          <button
            onClick={handleMakeActive}
            className="px-3 py-1 rounded-full text-xs font-semibold border border-[var(--color-hairline)] bg-white text-[var(--color-ink)] hover:border-black/30 hover:bg-black/[0.02] active:scale-[0.97] transition-all"
          >
            Make Active
          </button>
        )}
      </div>
    </div>
  );
}

