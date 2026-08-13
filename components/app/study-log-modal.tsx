"use client";

import { useActiveStudyStore } from "@/lib/store/active-study-store";
import { Clock, Calendar, X, Timer } from "lucide-react";
import { cn } from "@/lib/utils";

export function StudyLogModal({ onClose }: { onClose: () => void }) {
  const {
    getDailyLogEntries,
    getFormattedDuration,
    status,
    autoPauseMinutes,
    setAutoPauseMinutes,
    resumeTracker,
    pauseTracker,
  } = useActiveStudyStore();

  const entries = getDailyLogEntries();
  const totalSeconds = entries.reduce((acc, curr) => acc + curr.seconds, 0);
  const avgSeconds = entries.length ? Math.round(totalSeconds / entries.length) : 0;
  const currentMinutes = autoPauseMinutes || 10;

  const presets = [1, 2, 3, 5, 7, 10];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        onClick={onClose}
      />

      {/* Dialog Card */}
      <div
        style={{ width: "92vw", maxWidth: "540px", minWidth: "320px" }}
        className="relative z-[101] bg-white text-ink rounded-2xl p-6 border border-hairline shadow-2xl space-y-4 max-h-[88vh] flex flex-col box-border"
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-hairline pb-4 shrink-0">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold mb-1">
              <Clock className="h-3.5 w-3.5" /> Daily Active Study Logs
            </div>
            <h3 className="font-extrabold text-ink text-xl">Study Time History</h3>
          </div>
          <button
            onClick={onClose}
            className="text-ink-muted hover:text-ink font-bold text-sm p-1 rounded-lg hover:bg-canvas-soft cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Overview Stat Cards */}
        <div className="grid grid-cols-2 gap-3 shrink-0">
          <div className="p-3.5 rounded-xl bg-canvas-soft border border-hairline">
            <p className="text-xs text-ink-muted font-medium">Total Tracked Time</p>
            <p className="text-lg font-extrabold text-ink mt-0.5">
              {getFormattedDuration(totalSeconds)}
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-canvas-soft border border-hairline">
            <p className="text-xs text-ink-muted font-medium">Daily Average</p>
            <p className="text-lg font-extrabold text-primary mt-0.5">
              {getFormattedDuration(avgSeconds)}
            </p>
          </div>
        </div>

        {/* Customizable Auto-Pause Inactivity Threshold Card */}
        <div className="p-3.5 rounded-xl bg-canvas-soft/80 border border-hairline shrink-0 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-ink">
              <Timer className="h-3.5 w-3.5 text-amber-600" />
              <span>Auto-Pause Inactivity Timer</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-900 font-mono font-bold text-xs">
              {currentMinutes} min{currentMinutes > 1 ? "s" : ""}
            </span>
          </div>

          <p className="text-[11px] text-ink-muted leading-relaxed">
            Countdown stays running when switching tabs. Only resets when you scroll or click on Shikhar.
          </p>

          {/* Quick preset chips */}
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            {presets.map((mins) => {
              const isSelected = currentMinutes === mins;
              return (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setAutoPauseMinutes(mins)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    isSelected
                      ? "bg-primary text-on-primary shadow-xs scale-102"
                      : "bg-surface border border-hairline text-ink-muted hover:text-ink hover:bg-canvas-soft"
                  )}
                >
                  {mins}m
                </button>
              );
            })}
          </div>

          {/* Precision Range Slider (1 to 10 mins) */}
          <div className="flex items-center gap-3 pt-1">
            <span className="text-[10px] font-bold text-ink-muted">1m</span>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={currentMinutes}
              onChange={(e) => setAutoPauseMinutes(Number(e.target.value))}
              className="w-full h-1.5 bg-hairline rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <span className="text-[10px] font-bold text-ink-muted">10m</span>
          </div>
        </div>

        {/* Scrollable Daily Logs List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-[120px]">
          <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint mb-1">
            Recorded Days ({entries.length})
          </div>

          {entries.map((entry) => {
            const isToday = entry.dateStr === useActiveStudyStore.getState().todayDateStr;
            const hoursDec = (entry.seconds / 3600).toFixed(1);

            return (
              <div
                key={entry.dateStr}
                className={cn(
                  "p-3.5 rounded-xl border flex items-center justify-between transition-colors",
                  isToday
                    ? "bg-primary/5 border-primary/30 ring-1 ring-primary/20"
                    : "bg-surface border-hairline"
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "h-9 w-9 rounded-lg flex items-center justify-center font-bold text-xs shrink-0",
                      isToday ? "bg-primary text-on-primary" : "bg-canvas-soft text-ink-muted"
                    )}
                  >
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-ink text-sm">{entry.formattedDate}</p>
                      {isToday && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary text-on-primary">
                          Today
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-ink-muted">{hoursDec} study hours logged</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-mono font-extrabold text-sm text-ink">
                    {getFormattedDuration(entry.seconds)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Status Indicator Footer */}
        <div className="pt-3 border-t border-hairline shrink-0 flex items-center justify-between text-xs text-ink-muted">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span
                className={cn(
                  "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                  status === "active" ? "bg-emerald-400" : "bg-amber-400"
                )}
              ></span>
              <span
                className={cn(
                  "relative inline-flex rounded-full h-2.5 w-2.5",
                  status === "active" ? "bg-emerald-500" : "bg-amber-500"
                )}
              ></span>
            </span>
            <span className="font-semibold text-ink">
              Status: {status === "active" ? "Active Tracking" : "Auto-Paused"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {status === "active" ? (
              <button
                onClick={pauseTracker}
                className="px-3 py-1.5 bg-canvas-soft border border-hairline text-ink font-bold rounded-lg text-xs hover:bg-hairline transition-colors flex items-center gap-1 cursor-pointer"
              >
                ⏸ Pause Timer
              </button>
            ) : (
              <button
                onClick={resumeTracker}
                className="px-3 py-1.5 bg-emerald-600 text-white font-bold rounded-lg text-xs hover:bg-emerald-700 transition-colors flex items-center gap-1 cursor-pointer"
              >
                ▶ Resume Timer
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-primary text-on-primary font-bold rounded-lg text-xs hover:bg-primary-active cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
