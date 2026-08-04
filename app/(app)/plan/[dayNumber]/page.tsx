"use client";

import { use } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, Calendar, CheckCircle2 } from "lucide-react";
import { TopicRow } from "@/components/plan/topic-row";
import { formatShortDate } from "@/lib/utils";
import { useToast } from "@/components/ui/toaster";

interface PlanTask {
  id: string;
  section: "QA" | "DILR" | "VARC" | "MOCK" | "REVIEW";
  title: string;
  scheduled_time: string | null;
  duration_minutes: number;
  completed: boolean;
}

interface PlanDay {
  day_number: number;
  date: string;
  tasks: PlanTask[];
}

export default function SingleDayPage({
  params,
}: {
  params: Promise<{ dayNumber: string }>;
}) {
  const resolvedParams = use(params);
  const targetDayNumber = parseInt(resolvedParams.dayNumber, 10);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading, isError } = useQuery<{ data: PlanDay[] }>({
    queryKey: ["plan"],
    queryFn: async () => {
      const res = await fetch("/api/plan");
      if (!res.ok) throw new Error("Failed to fetch plan");
      return res.json();
    },
  });

  const dayData = (data?.data ?? []).find((d) => d.day_number === targetDayNumber);
  const tasks = dayData?.tasks ?? [];
  const completedCount = tasks.filter((t) => t.completed).length;
  const isAllCompleted = tasks.length > 0 && completedCount === tasks.length;
  const progressPct = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

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
          ? `Day ${targetDayNumber} marked complete! 🎉`
          : `Day ${targetDayNumber} reset to incomplete`,
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
    <div className="space-y-6">
      <Link
        href="/plan"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to full plan
      </Link>

      {isLoading ? (
        <div className="h-64 bg-black/[0.06] rounded-[12px] animate-pulse" />
      ) : isError || !dayData ? (
        <div className="bg-white rounded-[12px] border border-[var(--color-hairline)] p-8 text-center space-y-3">
          <p className="text-base text-[var(--color-ink-muted)] font-medium">
            Day {targetDayNumber} not found in curriculum.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <header className="bg-white rounded-[12px] border border-[var(--color-hairline)] p-6 shadow-[var(--shadow-1)] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-eyebrow text-ink-muted uppercase tracking-wide flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatShortDate(dayData.date)}
                </p>
                <h1 className="text-heading-1 text-ink tracking-tight">
                  Day {dayData.day_number}
                </h1>
                <p className="text-body-sm text-ink-muted">
                  {completedCount} of {tasks.length} topics completed ({progressPct}%)
                </p>
              </div>

              {tasks.length > 0 && (
                <button
                  onClick={() => bulkToggleMutation.mutate(!isAllCompleted)}
                  disabled={bulkToggleMutation.isPending}
                  className={`inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-full border transition-all active:scale-[0.97] shrink-0 ${
                    isAllCompleted
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                      : "bg-[var(--color-primary)] text-white border-transparent hover:opacity-90"
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isAllCompleted ? "Day Complete (Click to Undo)" : "Mark Day Complete"}
                </button>
              )}
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-black/[0.06] rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-2 transition-all duration-300 rounded-full"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </header>

          <div className="space-y-3">
            {tasks.map((task) => (
              <TopicRow
                key={task.id}
                id={task.id}
                dayNumber={dayData.day_number}
                section={task.section}
                title={task.title}
                durationMinutes={task.duration_minutes}
                scheduledTime={task.scheduled_time}
                completed={task.completed}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
