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
  lastTickTime: number;
  autoPauseMinutes: number; // 1 to 10 minutes, default 10
  dailyLogs: Record<string, number>; // dateStr -> total seconds

  // Actions
  recordActivity: () => void;
  tickSecond: () => void;
  pauseTracker: () => void;
  resumeTracker: () => void;
  setAutoPauseMinutes: (minutes: number) => void;
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
      lastTickTime: Date.now(),
      autoPauseMinutes: 10,
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
            lastTickTime: now,
            status: "active",
          });
          return;
        }

        // Auto-resume if status was paused due to inactivity
        if (state.status === "paused-inactivity") {
          set({
            status: "active",
            lastActivityTime: now,
            lastTickTime: now,
          });
        } else if (state.status === "active") {
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
            lastTickTime: now,
            status: "active",
          });
          return;
        }

        // If manually paused or paused by inactivity, keep lastTickTime synced and return
        if (state.status === "paused-manual" || state.status === "paused-inactivity") {
          set({ lastTickTime: now });
          return;
        }

        // Active tracker: calculate idle time and elapsed active time with delta math
        const autoPauseMinutes = Math.min(10, Math.max(1, state.autoPauseMinutes || 10));
        const autoPauseLimitMs = autoPauseMinutes * 60 * 1000;
        const idleMs = Math.max(0, now - state.lastActivityTime);

        // If idle for >= configured autoPauseMinutes, auto-pause
        if (idleMs >= autoPauseLimitMs) {
          const triggerTime = state.lastActivityTime + autoPauseLimitMs;
          const activeMs = Math.max(0, triggerTime - state.lastTickTime);
          const secondsEarned = Math.floor(activeMs / 1000);

          const nextSecs = state.todayActiveSeconds + secondsEarned;
          const updatedLogs = {
            ...state.dailyLogs,
            [today]: nextSecs,
          };

          try {
            const hoursFormatted = (nextSecs / 3600).toFixed(1);
            localStorage.setItem("shikhar_user_hours", hoursFormatted);
          } catch (_e) {
            // ignore localStorage errors
          }

          set({
            todayActiveSeconds: nextSecs,
            dailyLogs: updatedLogs,
            status: "paused-inactivity",
            lastTickTime: now,
          });
          return;
        }

        // Active state with continuous background-resilient tracking
        const activeMs = Math.max(0, now - state.lastTickTime);
        const secondsEarned = Math.floor(activeMs / 1000);

        if (secondsEarned > 0) {
          const nextSecs = state.todayActiveSeconds + secondsEarned;
          const updatedLogs = {
            ...state.dailyLogs,
            [today]: nextSecs,
          };

          try {
            const hoursFormatted = (nextSecs / 3600).toFixed(1);
            localStorage.setItem("shikhar_user_hours", hoursFormatted);
          } catch (_e) {
            // ignore localStorage errors
          }

          set({
            todayActiveSeconds: nextSecs,
            dailyLogs: updatedLogs,
            lastTickTime: state.lastTickTime + (secondsEarned * 1000),
          });
        }
      },

      pauseTracker: () => {
        get().tickSecond();
        set({ status: "paused-manual", lastTickTime: Date.now() });
      },

      resumeTracker: () => {
        const now = Date.now();
        set({
          status: "active",
          lastActivityTime: now,
          lastTickTime: now,
        });
      },

      setAutoPauseMinutes: (minutes: number) => {
        const clamped = Math.min(10, Math.max(1, Math.round(minutes)));
        set({ autoPauseMinutes: clamped });
      },

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
        const autoPauseMinutes = Math.min(10, Math.max(1, state.autoPauseMinutes || 10));
        const autoPauseLimitMs = autoPauseMinutes * 60 * 1000;
        const idleMs = Date.now() - state.lastActivityTime;
        const remainingMs = Math.max(0, autoPauseLimitMs - idleMs);
        return Math.ceil(remainingMs / 1000);
      },
    }),
    {
      name: "shikhar-active-study-store",
    }
  )
);
