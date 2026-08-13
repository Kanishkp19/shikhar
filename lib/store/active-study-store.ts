import { create } from "zustand";
import { persist } from "zustand/middleware";

export type TrackerStatus = "active" | "paused-inactivity" | "paused-manual";

export interface DailyStudyLogEntry {
  dateStr: string; // YYYY-MM-DD
  formattedDate: string; // e.g. "13th August 2026"
  seconds: number;
}

interface ActiveStudyState {
  todayDateStr: string;
  todayActiveSeconds: number;
  status: TrackerStatus;
  lastActivityTime: number;
  dailyLogs: Record<string, number>; // dateStr -> total seconds

  // Actions
  recordActivity: () => void;
  tickSecond: () => void;
  pauseTracker: () => void;
  resumeTracker: () => void;
  getFormattedDuration: (seconds: number) => string;
  getDailyLogEntries: () => DailyStudyLogEntry[];
  getIdleRemainingSeconds: () => number;
}

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatSecondsToHumanReadable(seconds: number): string {
  if (!seconds || seconds <= 0) return "0 mins";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);

  if (hrs > 0) {
    return `${hrs} hr${hrs > 1 ? "s" : ""} ${mins} min${mins !== 1 ? "s" : ""}`;
  }
  return `${mins} min${mins !== 1 ? "s" : ""}`;
}

export function formatSecondsToMMSS(seconds: number): string {
  if (!seconds || seconds <= 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function formatDateStringToHuman(dateStr: string): string {
  try {
    const parts = dateStr.split("-");
    if (parts.length < 3) return dateStr;
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return dateStr;

    const date = new Date(year, month - 1, day);
    const dayNum = date.getDate();

    // Ordinal suffix (1st, 2nd, 3rd, 13th, etc.)
    let suffix = "th";
    if (dayNum % 10 === 1 && dayNum !== 11) suffix = "st";
    else if (dayNum % 10 === 2 && dayNum !== 12) suffix = "nd";
    else if (dayNum % 10 === 3 && dayNum !== 13) suffix = "rd";

    const monthName = date.toLocaleString("en-US", { month: "long" });
    return `${dayNum}${suffix} ${monthName} ${year}`;
  } catch (_e) {
    return dateStr;
  }
}

export const useActiveStudyStore = create<ActiveStudyState>()(
  persist(
    (set, get) => ({
      todayDateStr: getTodayDateString(),
      todayActiveSeconds: 0,
      status: "active",
      lastActivityTime: Date.now(),
      dailyLogs: {},

      recordActivity: () => {
        const now = Date.now();
        const state = get();
        const today = getTodayDateString();

        // If day changed while app is open, rollover to new date
        if (state.todayDateStr !== today) {
          set({
            todayDateStr: today,
            todayActiveSeconds: state.dailyLogs[today] || 0,
            lastActivityTime: now,
            status: "active",
          });
          return;
        }

        // Auto-resume if status was paused due to inactivity
        if (state.status === "paused-inactivity") {
          set({
            status: "active",
            lastActivityTime: now,
          });
        } else {
          set({ lastActivityTime: now });
        }
      },

      tickSecond: () => {
        const state = get();
        const now = Date.now();
        const today = getTodayDateString();

        // Day rollover check
        if (state.todayDateStr !== today) {
          set({
            todayDateStr: today,
            todayActiveSeconds: state.dailyLogs[today] || 0,
            lastActivityTime: now,
            status: "active",
          });
          return;
        }

        // If manually paused, do nothing
        if (state.status === "paused-manual") return;

        // Calculate time elapsed since last activity
        const idleMs = now - state.lastActivityTime;

        // If idle for >= 10 minutes (600,000ms), auto-pause
        if (idleMs >= 600_000) {
          if (state.status === "active") {
            set({ status: "paused-inactivity" });
          }
          return;
        }

        // If active, increment time
        if (state.status === "active") {
          const nextSecs = state.todayActiveSeconds + 1;
          const updatedLogs = {
            ...state.dailyLogs,
            [today]: nextSecs,
          };

          // Keep shikhar_user_hours synced for Rival & Progress components
          try {
            const hoursFormatted = (nextSecs / 3600).toFixed(1);
            localStorage.setItem("shikhar_user_hours", hoursFormatted);
          } catch (_e) {
            // ignore localStorage errors
          }

          set({
            todayActiveSeconds: nextSecs,
            dailyLogs: updatedLogs,
          });
        }
      },

      pauseTracker: () => set({ status: "paused-manual" }),

      resumeTracker: () => set({ status: "active", lastActivityTime: Date.now() }),

      getFormattedDuration: (seconds: number) => formatSecondsToHumanReadable(seconds),

      getDailyLogEntries: () => {
        const logs = get().dailyLogs;
        const today = getTodayDateString();

        // Ensure today is represented
        const allDates = Array.from(new Set([...Object.keys(logs), today]));
        allDates.sort((a, b) => b.localeCompare(a)); // Newest first

        return allDates.map((dateStr) => ({
          dateStr,
          formattedDate: formatDateStringToHuman(dateStr),
          seconds: logs[dateStr] || (dateStr === today ? get().todayActiveSeconds : 0),
        }));
      },

      getIdleRemainingSeconds: () => {
        const state = get();
        if (state.status !== "active") return 0;
        const idleMs = Date.now() - state.lastActivityTime;
        const remainingMs = Math.max(0, 600_000 - idleMs);
        return Math.ceil(remainingMs / 1000);
      },
    }),
    {
      name: "shikhar-active-study-store",
    }
  )
);
