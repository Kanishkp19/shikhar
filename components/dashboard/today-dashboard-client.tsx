"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TodayPlanCard } from "@/components/dashboard/today-plan-card";
import { StatCard } from "@/components/dashboard/stat-card";
import { Flame, Target, CheckCircle2, BookOpen } from "lucide-react";
import type { Task, StreakInfo } from "@/lib/types";
import { todayISODate } from "@/lib/utils";
import { useToast } from "@/components/ui/toaster";

/**
 * Client island for the Today dashboard.
 * Receives SSR'd initial data, then manages mutations (task toggle) and
 * re-fetches streak info after a successful toggle.
 */

interface Props {
  initialTasks: Task[];
  initialStreak: StreakInfo;
  mockCount: number;
}

import { ActiveTopicCard } from "@/components/dashboard/active-topic-card";

export function TodayDashboardClient({ initialTasks, initialStreak, mockCount }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: tasks = initialTasks, refetch } = useQuery({
    queryKey: ["tasks", "today"],
    queryFn: async () => {
      const res = await fetch(`/api/tasks?date=${todayISODate()}`);
      if (!res.ok) throw new Error("Failed to load tasks");
      const json = await res.json();
      return json.data as Task[];
    },
    initialData: initialTasks,
  });

  const { data: streak = initialStreak } = useQuery({
    queryKey: ["streak"],
    queryFn: async () => {
      const res = await fetch(`/api/streak`);
      if (!res.ok) throw new Error("Failed to load streak");
      const json = await res.json();
      return json.data as StreakInfo;
    },
    initialData: initialStreak,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed, completedAt: completed ? new Date().toISOString() : null }),
      });
      if (!res.ok) throw new Error("Failed to update task");
      return res.json();
    },
    onMutate: async ({ id, completed }) => {
      await qc.cancelQueries({ queryKey: ["tasks", "today"] });
      const previous = qc.getQueryData<Task[]>(["tasks", "today"]);
      qc.setQueryData<Task[]>(["tasks", "today"], (old) =>
        (old ?? []).map((t) => (t.id === id ? { ...t, completed } : t)),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(["tasks", "today"], ctx.previous);
      toast({ title: "Couldn't update task", tone: "error" });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["tasks", "today"] });
      qc.invalidateQueries({ queryKey: ["streak"] });
    },
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Current Streak"
          value={`${streak.currentStreak} day${streak.currentStreak === 1 ? "" : "s"}`}
          caption={`Longest: ${streak.longestStreak} days`}
          icon={<Flame className="h-4 w-4" />}
        />
        <StatCard
          label="Today's Progress"
          value={`${streak.todayCompleted}/${streak.todayTotal}`}
          caption={streak.todayTotal === 0 ? "Nothing scheduled" : "Keep going"}
          icon={<Target className="h-4 w-4" />}
        />
        <StatCard
          label="Total Completed"
          value={streak.totalCompleted}
          caption="Across all days"
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <StatCard
          label="Mocks Logged"
          value={mockCount}
          caption="See Progress tab"
          icon={<BookOpen className="h-4 w-4" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-1">
          <ActiveTopicCard />
        </div>
        <div className="lg:col-span-2">
          <TodayPlanCard
            tasks={tasks}
            onToggle={(id, completed) => toggleMutation.mutate({ id, completed })}
            pendingTaskId={toggleMutation.isPending ? toggleMutation.variables?.id ?? null : null}
            onRetry={() => refetch()}
          />
        </div>
      </div>
    </div>
  );
}
