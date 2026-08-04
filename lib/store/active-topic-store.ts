import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Section } from "@/lib/types";

export interface ActiveTopic {
  id?: string;
  dayNumber: number;
  title: string;
  section: Section;
  durationMinutes: number;
  scheduledTime?: string | null;
}

export interface ActiveSession {
  id: string;
  topicTitle: string;
  section: Section;
  status: "running" | "paused" | "completed";
  startedAt: string;
  elapsedSeconds: number;
}

interface ActiveTopicState {
  activeTopic: ActiveTopic | null;
  activeSession: ActiveSession | null;
  setActiveTopic: (topic: ActiveTopic) => void;
  clearActiveTopic: () => void;
  setActiveSession: (session: ActiveSession | null) => void;
  updateSessionElapsed: (elapsed: number) => void;
  setSessionStatus: (status: "running" | "paused" | "completed") => void;
}

export const useActiveTopicStore = create<ActiveTopicState>()(
  persist(
    (set) => ({
      activeTopic: null,
      activeSession: null,
      setActiveTopic: (topic) => set({ activeTopic: topic }),
      clearActiveTopic: () => set({ activeTopic: null, activeSession: null }),
      setActiveSession: (session) => set({ activeSession: session }),
      updateSessionElapsed: (elapsed) =>
        set((state) =>
          state.activeSession
            ? { activeSession: { ...state.activeSession, elapsedSeconds: elapsed } }
            : state
        ),
      setSessionStatus: (status) =>
        set((state) =>
          state.activeSession
            ? { activeSession: { ...state.activeSession, status } }
            : state
        ),
    }),
    {
      name: "shikhar-active-topic-storage",
    }
  )
);
