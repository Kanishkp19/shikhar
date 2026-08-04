import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * StatCard — dashboard top-row metric card.
 * Shows a label, big number, and an optional caption / delta.
 */
export interface StatCardProps {
  label: string;
  value: string | number;
  caption?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function StatCard({ label, value, caption, icon, className }: StatCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-eyebrow text-ink-muted uppercase tracking-wide">{label}</p>
          <p className="text-heading-2 text-ink mt-1 font-bold">{value}</p>
          {caption ? (
            <p className="text-caption text-ink-faint mt-1">{caption}</p>
          ) : null}
        </div>
        {icon ? (
          <div className="shrink-0 h-9 w-9 rounded-md bg-canvas-soft flex items-center justify-center text-ink-muted">
            {icon}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
