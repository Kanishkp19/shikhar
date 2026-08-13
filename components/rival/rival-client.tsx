"use client";

import { useState, useEffect } from "react";
import {
  Swords,
  Trophy,
  CheckCircle2,
  Clock,
  Target,
  Users,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  RIVAL_PERSONAS,
  DAILY_CHALLENGES,
  getSimulatedRivalState,
  RivalChallenge,
} from "@/lib/rival/rival-data";
import { useActiveStudyStore } from "@/lib/store/active-study-store";

export function RivalClient() {
  const { todayActiveSeconds } = useActiveStudyStore();
  const [selectedRivalId, setSelectedRivalId] = useState<string>("aaditya");
  const [extraHours, setExtraHours] = useState<number>(0);
  const [userQuestions, setUserQuestions] = useState<number>(18);
  const [completedChallenges, setCompletedChallenges] = useState<string[]>([]);
  const [userScoreXP, setUserScoreXP] = useState<number>(350);
  const [logModalOpen, setLogModalOpen] = useState<boolean>(false);
  const [logHoursInput, setLogHoursInput] = useState<string>("0.5");
  const [logQuestionsInput, setLogQuestionsInput] = useState<string>("5");

  // Real active study hours + extra manually logged hours
  const activeHours = +(todayActiveSeconds / 3600).toFixed(1);
  const userHours = +(activeHours + extraHours).toFixed(1);

  // Load saved rival state on mount
  useEffect(() => {
    const savedRival = localStorage.getItem("shikhar_selected_rival");
    if (savedRival) setSelectedRivalId(savedRival);

    const savedExtra = localStorage.getItem("shikhar_extra_hours");
    if (savedExtra) setExtraHours(parseFloat(savedExtra));

    const savedQuestions = localStorage.getItem("shikhar_user_questions");
    if (savedQuestions) setUserQuestions(parseInt(savedQuestions, 10));

    const savedXP = localStorage.getItem("shikhar_user_xp");
    if (savedXP) setUserScoreXP(parseInt(savedXP, 10));

    const savedChallenges = localStorage.getItem("shikhar_completed_challenges");
    if (savedChallenges) {
      try {
        setCompletedChallenges(JSON.parse(savedChallenges));
      } catch (_e) {
        // Fallback
      }
    }
  }, []);

  const handleSelectRival = (id: string) => {
    setSelectedRivalId(id);
    localStorage.setItem("shikhar_selected_rival", id);
  };

  const rivalState = getSimulatedRivalState(selectedRivalId);
  const { rival, hoursDone: rivalHours, questionsDone: rivalQuestions, statusMessage } = rivalState;

  // Comparison status
  const hourDiff = +(userHours - rivalHours).toFixed(1);
  const isAhead = hourDiff >= 0;

  const handleToggleChallenge = (challenge: RivalChallenge) => {
    let updated: string[];
    let xpDelta = 0;
    if (completedChallenges.includes(challenge.id)) {
      updated = completedChallenges.filter((id) => id !== challenge.id);
      xpDelta = -challenge.xp;
    } else {
      updated = [...completedChallenges, challenge.id];
      xpDelta = challenge.xp;
    }
    setCompletedChallenges(updated);
    localStorage.setItem("shikhar_completed_challenges", JSON.stringify(updated));

    const newXP = Math.max(0, userScoreXP + xpDelta);
    setUserScoreXP(newXP);
    localStorage.setItem("shikhar_user_xp", newXP.toString());
  };

  const handleLogStudySession = (e: React.FormEvent) => {
    e.preventDefault();
    const addHours = parseFloat(logHoursInput) || 0;
    const addQ = parseInt(logQuestionsInput, 10) || 0;

    const nextExtra = +(extraHours + addHours).toFixed(1);
    const newQuestions = userQuestions + addQ;
    const newXP = userScoreXP + Math.floor(addHours * 50) + addQ * 5;

    setExtraHours(nextExtra);
    setUserQuestions(newQuestions);
    setUserScoreXP(newXP);

    localStorage.setItem("shikhar_extra_hours", nextExtra.toString());
    localStorage.setItem("shikhar_user_questions", newQuestions.toString());
    localStorage.setItem("shikhar_user_xp", newXP.toString());

    setLogModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-secondary text-on-secondary p-6 md:p-8 shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold tracking-wide text-white/90 mb-3">
              <Swords className="h-3.5 w-3.5 text-yellow-300" />
              Ghost Rival Arena
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Head-to-Head Topper Battle
            </h1>
            <p className="text-sm text-white/80 mt-1 max-w-xl">
              Race against simulated 99+ percentile aspirants. Stay accountable without social distractions.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-3.5 rounded-xl border border-white/15">
            <div className="h-10 w-10 rounded-lg bg-yellow-400/20 border border-yellow-300/30 flex items-center justify-center text-yellow-300">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-white/70 font-medium">Your Prep XP</p>
              <p className="text-xl font-black text-white">{userScoreXP} <span className="text-xs font-normal text-white/80">XP</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* Live Match Ticker */}
      <div className="flex items-center gap-3 p-4 rounded-xl border border-hairline bg-surface shadow-xs">
        <div className="relative flex h-3 w-3 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
        </div>
        <p className="text-sm font-medium text-ink flex-1 truncate">
          <span className="font-bold text-primary">Live Ticker: </span>
          {statusMessage}
        </p>
        <button
          onClick={() => setLogModalOpen(true)}
          className="shrink-0 px-3 py-1.5 rounded-lg bg-primary text-on-primary font-semibold text-xs hover:bg-primary-active transition-colors"
        >
          + Log Session
        </button>
      </div>

      {/* Main Dual Match Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Card */}
        <div className="feature-card space-y-4 border-2 border-primary/20 bg-canvas/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-lg">
                YOU
              </div>
              <div>
                <h3 className="font-bold text-ink">You (Kanishk)</h3>
                <p className="text-xs text-ink-muted">CAT 2026 Target: 99.5+%ile</p>
              </div>
            </div>
            <span className={cn(
              "px-2.5 py-1 rounded-md text-xs font-bold",
              isAhead ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"
            )}>
              {isAhead ? `+${hourDiff} hrs Ahead 🚀` : `${Math.abs(hourDiff)} hrs Behind ⚡`}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3 rounded-lg bg-canvas-soft border border-hairline">
              <div className="flex items-center gap-1.5 text-xs text-ink-muted mb-1">
                <Clock className="h-3.5 w-3.5 text-primary" /> Study Time Today
              </div>
              <p className="text-xl font-bold text-ink">{userHours} <span className="text-xs font-medium text-ink-muted">hrs</span></p>
            </div>
            <div className="p-3 rounded-lg bg-canvas-soft border border-hairline">
              <div className="flex items-center gap-1.5 text-xs text-ink-muted mb-1">
                <Target className="h-3.5 w-3.5 text-emerald-600" /> Questions Solved
              </div>
              <p className="text-xl font-bold text-ink">{userQuestions} <span className="text-xs font-medium text-ink-muted">q&apos;s</span></p>
            </div>
          </div>

          {/* Progress comparison bar */}
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-ink-muted">Daily Target Pacing ({userHours} / 5.0 hrs)</span>
              <span className="text-primary font-semibold">{Math.min(100, Math.round((userHours / 5.0) * 100))}%</span>
            </div>
            <div className="h-2.5 w-full bg-hairline rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500 rounded-full"
                style={{ width: `${Math.min(100, (userHours / 5.0) * 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Selected Rival Card */}
        <div className="feature-card space-y-4 bg-surface">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-secondary/10 text-secondary border border-secondary/20 flex items-center justify-center text-xl">
                {rival.avatar}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-ink">{rival.name}</h3>
                  <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold">
                    {rival.targetPercentile}
                  </span>
                </div>
                <p className="text-xs text-ink-muted">{rival.title}</p>
              </div>
            </div>
            <span className="text-xs font-medium text-ink-faint">Ghost Topper</span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3 rounded-lg bg-canvas-soft border border-hairline">
              <div className="flex items-center gap-1.5 text-xs text-ink-muted mb-1">
                <Clock className="h-3.5 w-3.5 text-secondary" /> Rival Study Time
              </div>
              <p className="text-xl font-bold text-ink">{rivalHours} <span className="text-xs font-medium text-ink-muted">hrs</span></p>
            </div>
            <div className="p-3 rounded-lg bg-canvas-soft border border-hairline">
              <div className="flex items-center gap-1.5 text-xs text-ink-muted mb-1">
                <Target className="h-3.5 w-3.5 text-amber-600" /> Rival Solved
              </div>
              <p className="text-xl font-bold text-ink">{rivalQuestions} <span className="text-xs font-medium text-ink-muted">q&apos;s</span></p>
            </div>
          </div>

          {/* Progress comparison bar */}
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-ink-muted">Rival Target Pacing ({rivalHours} / {rival.targetHoursDaily} hrs)</span>
              <span className="text-secondary font-semibold">{Math.min(100, Math.round((rivalHours / rival.targetHoursDaily) * 100))}%</span>
            </div>
            <div className="h-2.5 w-full bg-hairline rounded-full overflow-hidden">
              <div
                className="h-full bg-secondary transition-all duration-500 rounded-full"
                style={{ width: `${Math.min(100, (rivalHours / rival.targetHoursDaily) * 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Choose Rival Persona Section */}
      <div className="feature-card space-y-4">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <h2 className="text-heading-3 font-bold text-ink">Choose Your Rival Persona</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {RIVAL_PERSONAS.map((p) => {
            const isSelected = p.id === selectedRivalId;
            return (
              <button
                key={p.id}
                onClick={() => handleSelectRival(p.id)}
                className={cn(
                  "p-4 rounded-xl text-left border transition-all space-y-2 flex flex-col justify-between",
                  isSelected
                    ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary"
                    : "border-hairline bg-surface hover:bg-canvas-soft"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{p.avatar}</span>
                  <span className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full",
                    isSelected ? "bg-primary text-on-primary" : "bg-canvas-soft text-ink-muted"
                  )}>
                    {p.targetPercentile}
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-ink text-sm">{p.name}</h4>
                  <p className="text-xs text-ink-muted line-clamp-1">{p.title}</p>
                </div>
                <p className="text-xs text-ink-secondary italic line-clamp-2">&quot;{p.motto}&quot;</p>
                <div className="pt-2 border-t border-hairline/60 flex items-center justify-between text-[11px] text-ink-muted">
                  <span>🎯 {p.targetHoursDaily} hrs/day</span>
                  <span>⚡ {p.targetQuestionsDaily} q&apos;s/day</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Daily Duels & Head-to-Head Challenges */}
      <div className="feature-card space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            <h2 className="text-heading-3 font-bold text-ink">Daily Head-to-Head Duels</h2>
          </div>
          <span className="text-xs font-semibold text-ink-muted">
            Completed: {completedChallenges.length} / {DAILY_CHALLENGES.length}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DAILY_CHALLENGES.map((ch) => {
            const isCompleted = completedChallenges.includes(ch.id);
            return (
              <div
                key={ch.id}
                className={cn(
                  "p-4 rounded-xl border transition-all space-y-3",
                  isCompleted
                    ? "bg-emerald-50/50 border-emerald-200"
                    : "bg-surface border-hairline"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-canvas-soft text-ink-muted uppercase tracking-wider">
                      {ch.category}
                    </span>
                    <h3 className="font-bold text-ink text-sm mt-1">{ch.title}</h3>
                    <p className="text-xs text-ink-muted mt-0.5">{ch.description}</p>
                  </div>
                  <span className="shrink-0 px-2 py-1 rounded bg-amber-100 text-amber-800 text-xs font-bold">
                    +{ch.xp} XP
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-canvas-soft/80 border border-hairline text-xs text-ink-secondary flex items-center justify-between">
                  <span className="truncate text-ink-muted font-medium">⚡ {ch.rivalProgress}</span>
                </div>

                <button
                  onClick={() => handleToggleChallenge(ch)}
                  className={cn(
                    "w-full py-2 rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-1.5",
                    isCompleted
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : "bg-primary text-on-primary hover:bg-primary-active"
                  )}
                >
                  {isCompleted ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" /> Challenge Completed!
                    </>
                  ) : (
                    <>
                      Accept & Complete Duel
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Log Modal */}
      {logModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            style={{ width: "92vw", maxWidth: "500px", minWidth: "300px" }}
            className="bg-white text-ink rounded-xl p-6 border border-hairline shadow-2xl space-y-4 box-border relative z-10"
          >
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <h3 className="font-bold text-ink text-lg">Log Study Session</h3>
              <button
                onClick={() => setLogModalOpen(false)}
                className="text-ink-muted hover:text-ink font-bold text-sm"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleLogStudySession} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink-muted uppercase mb-1">
                  Additional Study Time (Hours)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="12"
                  value={logHoursInput}
                  onChange={(e) => setLogHoursInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-hairline bg-canvas focus:outline-none focus:ring-2 focus:ring-primary text-sm font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-muted uppercase mb-1">
                  Questions Solved
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="200"
                  value={logQuestionsInput}
                  onChange={(e) => setLogQuestionsInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-hairline bg-canvas focus:outline-none focus:ring-2 focus:ring-primary text-sm font-medium"
                  required
                />
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setLogModalOpen(false)}
                  className="flex-1 py-2.5 rounded-lg border border-hairline font-semibold text-xs text-ink-muted hover:bg-canvas-soft"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-lg bg-primary text-on-primary font-semibold text-xs hover:bg-primary-active"
                >
                  Update My Progress
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
