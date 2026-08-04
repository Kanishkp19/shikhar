import { cn } from "@/lib/utils";

/**
 * EmptyState — generic empty/zero-data card section.
 * Used when there's no content to show (no tasks, no notes, no news, etc.)
 * per TRD: "no empty screens, always show a meaningful message".
 */
export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-12 px-6",
        className,
      )}
    >
      {icon ? (
        <div className="mb-3 h-12 w-12 rounded-full bg-canvas-soft flex items-center justify-center text-ink-faint">
          {icon}
        </div>
      ) : null}
      <p className="text-title text-ink">{title}</p>
      {description ? (
        <p className="text-body-sm text-ink-muted mt-1 max-w-sm">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
