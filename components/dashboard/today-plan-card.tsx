import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskRow } from "./task-row";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { CheckCircle2, CalendarClock } from "lucide-react";
import type { Task } from "@/lib/types";

/**
 * TodayPlanCard — the dashboard's primary card.
 * Lists today's tasks grouped by "scheduled" then "anytime".
 * Handles loading, empty, and error states per TRD's UI requirements.
 */

export interface TodayPlanCardProps {
  tasks: Task[];
  isLoading?: boolean;
  isError?: boolean;
  onToggle: (id: string, completed: boolean) => void;
  pendingTaskId?: string | null;
  onRetry?: () => void;
}

export function TodayPlanCard({
  tasks,
  isLoading,
  isError,
  onToggle,
  pendingTaskId,
  onRetry,
}: TodayPlanCardProps) {
  const scheduled = tasks.filter((t) => t.scheduledTime).sort((a, b) =>
    (a.scheduledTime ?? "").localeCompare(b.scheduledTime ?? ""),
  );
  const anytime = tasks.filter((t) => !t.scheduledTime);
  const completedCount = tasks.filter((t) => t.completed).length;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-primary" />
          <CardTitle>Today's Plan</CardTitle>
        </div>
        {!isLoading && !isError && tasks.length > 0 ? (
          <span className="text-caption text-ink-muted">
            {completedCount}/{tasks.length} done
          </span>
        ) : null}
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : isError ? (
          <div className="p-6 text-center">
            <p className="text-body-sm text-ink-muted mb-3">
              Couldn't load today's tasks.
            </p>
            {onRetry ? (
              <button
                onClick={onRetry}
                className="text-body-sm text-primary hover:underline"
              >
                Retry
              </button>
            ) : null}
          </div>
        ) : tasks.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 className="h-8 w-8" />}
            title="No tasks scheduled today"
            description="Enjoy the breather, or jump ahead and start tomorrow's plan."
          />
        ) : (
          <>
            {scheduled.length > 0 ? (
              <div>
                <p className="text-eyebrow text-ink-faint uppercase tracking-wide px-4 pt-2 pb-1">
                  Scheduled
                </p>
                {scheduled.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    onToggle={onToggle}
                    isPending={pendingTaskId === t.id}
                  />
                ))}
              </div>
            ) : null}
            {anytime.length > 0 ? (
              <div>
                <p className="text-eyebrow text-ink-faint uppercase tracking-wide px-4 pt-2 pb-1">
                  Anytime
                </p>
                {anytime.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    onToggle={onToggle}
                    isPending={pendingTaskId === t.id}
                  />
                ))}
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
