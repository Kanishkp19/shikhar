"use client";

import * as React from "react";
import { Send } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

/**
 * ChatInput — composer for tutor messages.
 * - Enter sends, Shift+Enter inserts a newline.
 * - Disabled while a reply is in flight.
 * - Per TRD: max 2000 chars (validated client + server via Zod).
 */

export interface ChatInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, disabled, placeholder }: ChatInputProps) {
  const [value, setValue] = React.useState("");

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="border-t border-hairline p-3 bg-surface">
      <div className="flex items-end gap-2">
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder ?? "Ask your doubt… (Enter to send, Shift+Enter for newline)"}
          className="min-h-[44px] max-h-[160px] flex-1 resize-none"
          maxLength={2000}
          rows={1}
        />
        <Button
          onClick={submit}
          disabled={disabled || !value.trim()}
          size="icon"
          className="h-11 w-11 shrink-0"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-caption text-ink-faint mt-1.5 px-1">
        {value.length}/2000 — responses from Llama 3.3 70B via Groq (free tier).
      </p>
    </div>
  );
}
