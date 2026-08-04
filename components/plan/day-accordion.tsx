"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Calendar, CheckCircle2 } from "lucide-react";
import { TopicRow } from "./topic-row";
import { formatShortDate } from "@/lib/utils";
import { useToast } from "@/components/ui/toaster";

interface DayAccordionProps {
  dayNumber: number;
  dateStr: string;
  isToday: boolean;
  defaultExpanded?: boolean;
  tasks: Array<{
    id: string;
    section: "QA" | "DILR" | "VARC" | "MOCK" | "REVIEW";
    title: string;
    scheduled_time: string | null;
    duration_minutes: number;
    completed: boolean;
  }>;
}

export function DayAccordion({
  dayNumber,
  dateStr,
  isToday,
  defaultExpanded = false,
  tasks,
}: DayAccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultExpanded || isToday);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const completedCount = tasks.filter((t) => t.completed).length;
  const isAllCompleted = tasks.length > 0 && completedCount === tasks.length;

  const bulkToggleMutation = useMutation({
    mutationFn: async (targetCompleted: boolean) => {
      const taskIds = tasks.map((t) => t.id).filter(Boolean);
      if (taskIds.length === 0) return;
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskIds,
          completed: targetCompleted,
        }),
      });
      if (!res.ok) throw new Error("Failed to update day tasks");
      return res.json();
    },
    onSuccess: (_, targetCompleted) => {
      toast({
        title: targetCompleted
          ? `Day ${dayNumber} marked complete! 🎉`
          : `Day ${dayNumber} reset to incomplete`,
      });
      queryClient.invalidateQueries({ queryKey: ["plan"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["streak"] });
    },
    onError: () => {
      toast({ title: "Couldn't update day tasks", tone: "error" });
    },
  });

  return (
    <div
      className={`rounded-[12px] border transition-all ${
        isToday
          ? "border-[var(--color-primary)] bg-white shadow-[var(--shadow-1)] ring-1 ring-[var(--color-primary)]/20"
          : "border-[var(--color-hairline)] bg-white"
      }`}
    >
      <div className="px-5 py-4 flex items-center justify-between gap-4">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-3 flex-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded-[8px]"
        >
          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-[var(--color-ink-muted)] shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-[var(--color-ink-muted)] shrink-0" />
          )}

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-[var(--color-ink)]">
                Day {dayNumber}
              </h3>
              {isToday && (
                <span className="bg-[var(--color-primary)] text-white text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full">
                  Today
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--color-ink-muted)] flex items-center gap-1 mt-0.5">
              <Calendar className="w-3 h-3" />
              {formatShortDate(dateStr)} • {tasks.length} topics
            </p>
          </div>
        </button>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs font-semibold text-[var(--color-ink-muted)]">
            {completedCount}/{tasks.length} Done
          </span>

          {tasks.length > 0 && (
            <button
              onClick={() => bulkToggleMutation.mutate(!isAllCompleted)}
              disabled={bulkToggleMutation.isPending}
              className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition-all active:scale-[0.97] ${
                isAllCompleted
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                  : "bg-white text-[var(--color-ink)] border-[var(--color-hairline)] hover:bg-black/[0.04]"
              }`}
              title={isAllCompleted ? "Mark entire day incomplete" : "Mark entire day complete"}
            >
              {isAllCompleted ? (
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Day Complete
                </span>
              ) : (
                "Mark Day Done"
              )}
            </button>
          )}
        </div>
      </div>

      {isOpen && (
        <div className="px-5 pb-5 pt-1 space-y-2 border-t border-[var(--color-hairline)]">
          {tasks.length === 0 ? (
            <p className="text-xs text-[var(--color-ink-muted)] italic py-2">
              No matching topics for this day.
            </p>
          ) : (
            tasks.map((task) => (
              <TopicRow
                key={task.id}
                id={task.id}
                dayNumber={dayNumber}
                section={task.section}
                title={task.title}
                durationMinutes={task.duration_minutes}
                scheduledTime={task.scheduled_time}
                completed={task.completed}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
