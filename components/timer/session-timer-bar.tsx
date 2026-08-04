"use client";

import { useEffect, useRef } from "react";
import { useActiveTopicStore } from "@/lib/store/active-topic-store";
import { Play, Pause, Square, Sparkles, MessageSquare } from "lucide-react";
import Link from "next/link";

export function SessionTimerBar() {
  const { activeTopic, activeSession, setActiveSession, setSessionStatus, updateSessionElapsed, clearActiveTopic } =
    useActiveTopicStore();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  const isRunning = activeSession?.status === "running";
  const isPaused = activeSession?.status === "paused";
  const elapsed = activeSession?.elapsedSeconds ?? 0;

  // Start heartbeat when running
  useEffect(() => {
    if (isRunning) {
      // Local timer for UI
      timerRef.current = setInterval(() => {
        updateSessionElapsed((activeSession?.elapsedSeconds ?? 0) + 1);
      }, 1000);

      // Heartbeat to server every 60s
      heartbeatRef.current = setInterval(async () => {
        if (activeSession?.id) {
          await fetch(`/api/sessions`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId: activeSession.id, action: "heartbeat" }),
          }).catch(console.error);
        }
      }, 60_000);

      // Send initial heartbeat immediately
      if (activeSession?.id) {
        fetch(`/api/sessions`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: activeSession.id, action: "heartbeat" }),
        }).catch(console.error);
      }
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [isRunning, activeSession?.id, activeSession?.elapsedSeconds, updateSessionElapsed]);

  if (!activeTopic) return null;

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStart = async () => {
    if (!activeSession) {
      // Create new session in DB
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planTopicId: activeTopic.id,
          taskId: null,
          topicTitle: activeTopic.title,
          section: activeTopic.section,
        }),
      });
      const data = await res.json();
      if (data.data) {
        setActiveSession({
          id: data.data.id,
          topicTitle: data.data.topic_title,
          section: data.data.section,
          status: "running",
          startedAt: data.data.started_at,
          elapsedSeconds: 0,
        });
      }
    } else {
      // Resume existing session
      await fetch("/api/sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: activeSession.id, action: "resume" }),
      }).catch(console.error);
      setSessionStatus("running");
    }
  };

  const handlePause = async () => {
    if (activeSession?.id) {
      await fetch("/api/sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: activeSession.id, action: "pause" }),
      }).catch(console.error);
    }
    setSessionStatus("paused");
  };

  const handleStop = async () => {
    if (activeSession?.id) {
      await fetch("/api/sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: activeSession.id, action: "stop" }),
      }).catch(console.error);
    }
    setSessionStatus("completed");
    setTimeout(() => {
      clearActiveTopic();
    }, 500);
  };

  return (
    <div
      className={`sticky bottom-0 z-40 transition-colors duration-200 border-t ${
        isRunning
          ? "bg-[var(--color-secondary)] text-white border-transparent"
          : "bg-white text-[var(--color-ink)] border-[var(--color-hairline)] shadow-[var(--shadow-1)]"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Left: Active Topic Info */}
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.125px] ${
              isRunning ? "bg-white/20 text-white" : "bg-black/[0.04] text-[var(--color-ink-secondary)]"
            }`}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor:
                  activeTopic.section === "QA"
                    ? "var(--color-accent-teal)"
                    : activeTopic.section === "DILR"
                    ? "var(--color-accent-purple)"
                    : activeTopic.section === "VARC"
                    ? "var(--color-accent-orange)"
                    : activeTopic.section === "MOCK"
                    ? "var(--color-accent-pink)"
                    : "var(--color-accent-sky)",
              }}
            />
            {activeTopic.section}
          </span>
          <span className="font-semibold text-sm truncate max-w-xs sm:max-w-md">
            {activeTopic.title}
          </span>
        </div>

        {/* Middle: Live Timer */}
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider opacity-75 font-medium">Session:</span>
          <span className="font-mono text-xl font-bold tracking-tight" aria-live="polite">
            {formatTime(elapsed)}
          </span>
        </div>

        {/* Right: Controls & Quick Action Links */}
        <div className="flex items-center gap-2">
          <Link
            href={`/tutor?topic=${encodeURIComponent(activeTopic.title)}`}
            className={`p-2 rounded-full transition-transform active:scale-90 ${
              isRunning ? "hover:bg-white/10" : "hover:bg-black/5"
            }`}
            title="Ask Tutor about this topic"
          >
            <MessageSquare className="w-4 h-4" />
          </Link>
          <Link
            href={`/notes?topic=${encodeURIComponent(activeTopic.title)}`}
            className={`p-2 rounded-full transition-transform active:scale-90 ${
              isRunning ? "hover:bg-white/10" : "hover:bg-black/5"
            }`}
            title="Generate notes for this topic"
          >
            <Sparkles className="w-4 h-4" />
          </Link>

          <div className="h-4 w-px bg-current opacity-20 mx-1" />

          {!isRunning ? (
            <button
              onClick={handleStart}
              className="inline-flex items-center gap-1.5 bg-[var(--color-primary)] text-white text-xs font-semibold rounded-full px-3.5 py-1.5 hover:opacity-90 active:scale-[0.97] transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {isPaused ? "Resume" : "Start"}
            </button>
          ) : (
            <button
              onClick={handlePause}
              className="inline-flex items-center gap-1.5 bg-white/20 text-white hover:bg-white/30 text-xs font-semibold rounded-full px-3.5 py-1.5 active:scale-[0.97] transition-all"
            >
              <Pause className="w-3.5 h-3.5 fill-current" />
              Pause
            </button>
          )}

          <button
            onClick={handleStop}
            className={`p-2 rounded-full transition-transform active:scale-90 ${
              isRunning ? "hover:bg-white/10 text-white" : "hover:bg-black/5 text-[var(--color-danger)]"
            }`}
            title="Stop & Log Session"
          >
            <Square className="w-4 h-4 fill-current" />
          </button>
        </div>
      </div>
    </div>
  );
}