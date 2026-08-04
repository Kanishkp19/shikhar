import { cn } from "@/lib/utils";
import type { TutorMessage } from "@/lib/types";

/**
 * ChatBubble — single message in the tutor chat thread.
 * User messages align right, primary fill.
 * Assistant messages align left, white surface + hairline.
 */

export interface ChatBubbleProps {
  message: TutorMessage;
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === "user";
  return (
    <div
      className={cn(
        "flex w-full",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-lg px-3.5 py-2.5 text-body-sm whitespace-pre-wrap break-words",
          isUser
            ? "bg-primary text-on-primary rounded-br-sm"
            : "bg-surface text-ink border border-hairline rounded-bl-sm",
        )}
      >
        {message.content}
      </div>
    </div>
  );
}
