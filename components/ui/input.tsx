import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Input — text-input from 04-DESIGN.md.
 * White surface, hairline border, 4px radius, body-sm typography, 6px padding.
 * Focus adds the soft Level-1 shadow + Notion blue ring.
 */
const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded-xs border border-hairline bg-surface px-3 py-1.5 text-body-sm text-ink placeholder:text-ink-faint",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:ring-offset-canvas-soft focus:border-primary",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "transition-shadow",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
