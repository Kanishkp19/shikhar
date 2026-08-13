"use client";

import { useEffect, useState } from "react";
import { useActiveStudyStore, formatSecondsToMMSS } from "@/lib/store/active-study-store";
import { PauseCircle, PlayCircle, Clock, Hourglass, Pause, Play } from "lucide-react";
import { StudyLogModal } from "@/components/app/study-log-modal";
import { cn } from "@/lib/utils";

export function ActiveStudyTrackerProvider() {
  const {
    recordActivity,
    tickSecond,
    status,
    resumeTracker,
    pauseTracker,
    todayActiveSeconds,
    getFormattedDuration,
    getIdleRemainingSeconds,
  } = useActiveStudyStore();
  const [logModalOpen, setLogModalOpen] = useState(false);

  const idleRemaining = getIdleRemainingSeconds();
  const isActive = status === "active";
  const isAutoPaused = status === "paused-inactivity";

  // 1. Tick timer every 1 second
  useEffect(() => {
    const interval = setInterval(() => {
      tickSecond();
    }, 1000);

    return () => clearInterval(interval);
  }, [tickSecond]);

  // 2. Comprehensive capture-phase interaction listeners for 10-minute inactivity detection & instant auto-resume
  useEffect(() => {
    const handleUserInteraction = () => {
      useActiveStudyStore.getState().recordActivity();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        useActiveStudyStore.getState().recordActivity();
      }
    };

    const handleFocus = () => {
      useActiveStudyStore.getState().recordActivity();
    };

    const events = ["pointermove", "pointerdown", "mousedown", "keydown", "touchstart", "scroll", "wheel", "click"];
    const options = { capture: true, passive: true };

    events.forEach((evtName) => {
      document.addEventListener(evtName, handleUserInteraction, options);
    });
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      events.forEach((evtName) => {
        document.removeEventListener(evtName, handleUserInteraction, options);
      });
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const handleTogglePause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isActive) {
      pauseTracker();
    } else {
      resumeTracker();
    }
  };

  return (
    <>
      {/* Permanent Sleek Top-Right Active Study & 10m Countdown Badge */}
      <div className="fixed top-3 right-4 z-40 flex items-center gap-2">
        <div
          onClick={() => setLogModalOpen(true)}
          className={cn(
            "backdrop-blur-md border px-3 py-1.5 rounded-full shadow-sm flex items-center gap-2.5 cursor-pointer text-xs transition-all hover:scale-102",
            isActive
              ? "bg-surface/90 border-primary/30 text-ink"
              : isAutoPaused
              ? "bg-amber-500/20 border-amber-500/40 text-amber-950"
              : "bg-canvas-soft/90 border-hairline text-ink-muted"
          )}
        >
          {/* Status Dot */}
          <div className="relative flex h-2.5 w-2.5 shrink-0">
            {isActive ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </>
            ) : isAutoPaused ? (
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            ) : (
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-ink-faint"></span>
            )}
          </div>

          {/* Active Time */}
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span className="font-mono font-extrabold text-ink">
              {getFormattedDuration(todayActiveSeconds)}
            </span>
          </div>

          {/* Live 10m Countdown Indicator */}
          {isActive && (
            <div className="flex items-center gap-1 border-l border-hairline pl-2 text-ink-muted">
              <Hourglass className="h-3 w-3 text-amber-600 animate-spin" />
              <span className="text-[11px] font-medium">
                Auto-Pause: <strong className="font-mono text-amber-700 font-bold">{formatSecondsToMMSS(idleRemaining)}</strong>
              </span>
            </div>
          )}

          {!isActive && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 border-l border-hairline pl-2">
              {isAutoPaused ? "Auto-Paused (10m)" : "Paused"}
            </span>
          )}
        </div>

        {/* Quick Pause / Resume Button */}
        <button
          onClick={handleTogglePause}
          className={cn(
            "p-1.5 rounded-full border shadow-sm transition-transform active:scale-95 flex items-center justify-center backdrop-blur-md",
            isActive
              ? "bg-surface/90 border-hairline text-ink-muted hover:text-ink hover:bg-canvas-soft"
              : "bg-primary text-on-primary border-primary hover:bg-primary-active"
          )}
          title={isActive ? "Pause Study Timer" : "Resume Study Timer"}
        >
          {isActive ? (
            <Pause className="h-3.5 w-3.5 fill-current" />
          ) : (
            <Play className="h-3.5 w-3.5 fill-current" />
          )}
        </button>
      </div>

      {/* Auto-Paused Banner when 10 mins of inactivity is hit */}
      {isAutoPaused && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div className="bg-amber-950 text-amber-100 border border-amber-500/30 px-4 py-2.5 rounded-full shadow-lg flex items-center gap-3 backdrop-blur-md">
            <PauseCircle className="h-4 w-4 text-amber-400 shrink-0" />
            <p className="text-xs font-semibold">
              <span className="font-bold text-amber-300">Study Timer Auto-Paused:</span> 10 mins of inactivity detected.
            </p>
            <button
              onClick={resumeTracker}
              className="px-3 py-1 bg-amber-400 text-amber-950 rounded-full font-bold text-xs hover:bg-amber-300 transition-colors shrink-0 flex items-center gap-1"
            >
              <PlayCircle className="h-3.5 w-3.5" /> Resume
            </button>
          </div>
        </div>
      )}

      {/* Render Daily Study Log Modal if opened */}
      {logModalOpen && <StudyLogModal onClose={() => setLogModalOpen(false)} />}
    </>
  );
}
