"use client";

import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn, formatTime } from "@/lib/utils";
import type { Task, Section } from "@/lib/types";

/**
 * TaskRow — single task line on the Today dashboard.
 * Shows: checkbox, section tag (color-coded), title, scheduled time, duration.
 * Toggle calls `onToggle` which PATCHes `/api/tasks/[id]`.
 */

const sectionToneMap: Record<Section, "qa" | "dilr" | "varc" | "mock" | "review"> = {
  QA: "qa",
  DILR: "dilr",
  VARC: "varc",
  MOCK: "mock",
  REVIEW: "review",
};

export interface TaskRowProps {
  task: Task;
  onToggle: (id: string, completed: boolean) => void;
  isPending?: boolean;
}

export function TaskRow({ task, onToggle, isPending }: TaskRowProps) {
  const handleCheckedChange = (checked: boolean) => {
    onToggle(task.id, checked);
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3 border-b border-hairline last:border-b-0 transition-colors",
        task.completed ? "bg-canvas-soft/60" : "hover:bg-canvas-soft/40",
        isPending && "opacity-60",
      )}
    >
      <Checkbox
        checked={task.completed}
        onCheckedChange={handleCheckedChange}
        disabled={isPending}
        aria-label={`Mark "${task.title}" as ${task.completed ? "incomplete" : "complete"}`}
        className="mt-0.5"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge tone={sectionToneMap[task.section]}>{task.section}</Badge>
          <span className="text-caption text-ink-faint">
            {formatTime(task.scheduledTime)}
            {task.durationMinutes ? ` · ${task.durationMinutes} min` : ""}
          </span>
        </div>
        <p
          className={cn(
            "text-body-sm text-ink mt-1",
            task.completed && "line-through text-ink-faint",
          )}
        >
          {task.title}
        </p>
      </div>
    </div>
  );
}
