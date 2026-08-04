import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Badge — eyebrow / category pill from 04-DESIGN.md.
 * White surface, primary text, fully pill-shaped, 12px / 600 typography.
 *
 * The `tone` variants use the sticker palette for decoration only — never
 * painted on a CTA. Useful for tagging tasks by section (QA / DILR / VARC).
 */
const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2 py-0.5 text-eyebrow font-semibold tracking-wide whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "bg-canvas-soft text-ink-secondary border border-hairline",
        primary: "bg-surface text-primary border border-hairline",
        qa: "bg-canvas-soft text-accent-teal border border-hairline",
        dilr: "bg-canvas-soft text-accent-purple-deep border border-hairline",
        varc: "bg-canvas-soft text-accent-orange-deep border border-hairline",
        mock: "bg-canvas-soft text-accent-green border border-hairline",
        review: "bg-canvas-soft text-accent-pink border border-hairline",
        success: "bg-canvas-soft text-accent-green border border-hairline",
        warning: "bg-canvas-soft text-accent-orange border border-hairline",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

export { Badge, badgeVariants };
