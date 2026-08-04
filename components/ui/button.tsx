"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Shikhar Button — Notion-inspired.
 * Three structural variants only (no decorative colors on CTAs per 04-DESIGN.md):
 *   - primary  → Notion blue pill (`rounded-full`)
 *   - secondary → white pill on Level-1 shadow
 *   - utility  → white `rounded-md` with hairline border, tighter padding
 *
 * Sticker-palette colors are decoration-only and never used here.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas-soft active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-on-primary rounded-full px-5 py-2.5 hover:bg-primary-active shadow-soft",
        secondary:
          "bg-surface text-ink rounded-full px-5 py-2.5 border border-hairline hover:bg-canvas-soft shadow-soft",
        utility:
          "bg-surface text-ink rounded-md px-3.5 py-1 border border-hairline hover:bg-canvas-soft text-body-sm",
        ghost: "bg-transparent text-ink rounded-md px-3 py-1.5 hover:bg-canvas-soft",
        danger:
          "bg-transparent text-accent-orange rounded-md px-3 py-1.5 hover:bg-canvas-soft border border-hairline",
      },
      size: {
        sm: "text-body-sm px-3 py-1.5",
        md: "text-button px-4 py-2",
        lg: "text-button px-5 py-2.5",
        icon: "p-2",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
