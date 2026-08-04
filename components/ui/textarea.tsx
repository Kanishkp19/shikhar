import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Textarea — same chrome as Input, multi-line.
 */
const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[80px] w-full rounded-xs border border-hairline bg-surface px-3 py-2 text-body-sm text-ink placeholder:text-ink-faint",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:ring-offset-canvas-soft focus:border-primary",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "transition-shadow resize-y",
        className,
      )}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
