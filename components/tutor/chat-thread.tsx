"use client";

import * as React from "react";
import { ChatBubble } from "./chat-bubble";
import { Skeleton } from "@/components/ui/skeleton";
import type { TutorMessage } from "@/lib/types";

/**
 * ChatThread — scrollable list of messages.
 * Auto-scrolls to bottom on new messages. Shows a typing indicator while
 * waiting for the assistant's reply.
 */

export interface ChatThreadProps {
  messages: TutorMessage[];
  isLoading?: boolean;
  isSending?: boolean;
}

export function ChatThread({ messages, isLoading, isSending }: ChatThreadProps) {
  const endRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, isSending]);

  if (isLoading) {
    return (
      <div className="flex-1 space-y-3 p-4 overflow-y-auto">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className={i % 2 === 0 ? "h-12 w-3/4" : "h-12 w-2/3 ml-auto"} />
        ))}
      </div>
    );
  }

  if (messages.length === 0 && !isSending) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center">
        <div>
          <p className="text-title text-ink mb-1">Ask me anything about CAT prep</p>
          <p className="text-body-sm text-ink-muted">
            I know what you're studying today — go ahead and ask your doubt.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-3 p-4 overflow-y-auto">
      {messages.map((m) => (
        <ChatBubble key={m.id} message={m} />
      ))}
      {isSending ? (
        <div className="flex justify-start">
          <div className="bg-surface border border-hairline rounded-lg rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-ink-faint animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="h-2 w-2 rounded-full bg-ink-faint animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="h-2 w-2 rounded-full bg-ink-faint animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      ) : null}
      <div ref={endRef} />
    </div>
  );
}
