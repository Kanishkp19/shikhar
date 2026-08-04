"use client";

import * as React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ChatThread } from "@/components/tutor/chat-thread";
import { ChatInput } from "@/components/tutor/chat-input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toaster";
import type { TutorMessage } from "@/lib/types";

interface Props {
  initialMessages: TutorMessage[];
  todayDate: string;
  todaysTopics: string;
}

/**
 * TutorClient — manages chat state, calls /api/tutor.
 * Shows today's topic context badge above the thread.
 */
export function TutorClient({ initialMessages, todayDate, todaysTopics }: Props) {
  const { toast } = useToast();
  const [isSending, setIsSending] = React.useState(false);

  const { data: messages = initialMessages, refetch } = useQuery({
    queryKey: ["tutor", todayDate],
    queryFn: async () => {
      const res = await fetch(`/api/tutor?threadDate=${todayDate}`);
      if (!res.ok) throw new Error("Failed to load messages");
      const json = await res.json();
      return json.data as TutorMessage[];
    },
    initialData: initialMessages,
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, threadDate: todayDate }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (err.error?.code === "LLM_BUSY") {
          throw new Error("Tutor is busy — try again in a moment.");
        }
        throw new Error(err.error?.message ?? "Tutor request failed");
      }
      return res.json();
    },
    onMutate: () => setIsSending(true),
    onSuccess: () => {
      refetch();
    },
    onError: (err: Error) => {
      toast({ title: "Tutor unavailable", description: err.message, tone: "warning" });
    },
    onSettled: () => setIsSending(false),
  });

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-heading-1 text-ink tracking-tight">AI Tutor</h1>
        <p className="text-body-sm text-ink-muted mt-1">
          Knows what you're studying today. Ask your doubt — replies in ~2 seconds.
        </p>
      </header>

      <Card className="flex flex-col h-[calc(100vh-300px)] md:h-[calc(100vh-220px)] min-h-[360px] overflow-hidden">
        <div className="border-b border-hairline px-4 py-2 bg-canvas-soft/50">
          <p className="text-eyebrow text-ink-muted uppercase tracking-wide mb-1">
            Today's context
          </p>
          <div className="text-caption text-ink-secondary whitespace-pre-wrap line-clamp-2">
            {todaysTopics}
          </div>
        </div>
        <ChatThread messages={messages} isSending={isSending} />
        <ChatInput onSend={(content) => sendMutation.mutate(content)} disabled={isSending} />
      </Card>
    </div>
  );
}
