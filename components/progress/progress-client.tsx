"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalTrigger, ModalClose } from "@/components/ui/modal";
import { StatCard } from "@/components/dashboard/stat-card";
import { PercentileChart } from "@/components/progress/percentile-chart";
import { StreakChart } from "@/components/progress/streak-chart";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toaster";
import { Plus, Flame, TrendingUp, Award, Target, Clock, Calendar } from "lucide-react";
import type { MockScore, StreakInfo } from "@/lib/types";
import { useActiveStudyStore } from "@/lib/store/active-study-store";

interface Props {
  initialMocks: MockScore[];
  initialError?: string;
  streak: StreakInfo;
}

export function ProgressClient({ initialMocks, initialError, streak }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);

  const { data: mocks = initialMocks, isLoading } = useQuery({
    queryKey: ["mocks"],
    queryFn: async () => {
      const res = await fetch("/api/mocks");
      if (!res.ok) throw new Error("Failed to load mocks");
      const json = await res.json();
      return json.data as MockScore[];
    },
    initialData: initialMocks,
  });

  // Section strength calculation (TRD: flag if < 80)
  const sections = React.useMemo(() => {
    if (mocks.length === 0) return [];
    const calc = (key: "varcPercentile" | "dilrPercentile" | "qaPercentile", section: "VARC" | "DILR" | "QA") => {
      const values = mocks.map((m) => m[key]);
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      return { section, averagePercentile: Math.round(avg * 10) / 10, mockCount: mocks.length, flagged: avg < 80 };
    };
    return [calc("varcPercentile", "VARC"), calc("dilrPercentile", "DILR"), calc("qaPercentile", "QA")];
  }, [mocks]);

  // Mock form state
  const [form, setForm] = React.useState({
    mockName: "",
    mockDate: new Date().toISOString().split("T")[0]!,
    totalScore: "",
    overallPercentile: "",
    varcScore: "",
    varcPercentile: "",
    dilrScore: "",
    dilrPercentile: "",
    qaScore: "",
    qaPercentile: "",
    notes: "",
  });

  const setField = (k: keyof typeof form, v: string) => setForm((prev) => ({ ...prev, [k]: v }));

  const addMock = useMutation({
    mutationFn: async () => {
      const body = {
        mockName: form.mockName,
        mockDate: form.mockDate,
        totalScore: Number(form.totalScore),
        overallPercentile: Number(form.overallPercentile),
        varcScore: Number(form.varcScore),
        varcPercentile: Number(form.varcPercentile),
        dilrScore: Number(form.dilrScore),
        dilrPercentile: Number(form.dilrPercentile),
        qaScore: Number(form.qaScore),
        qaPercentile: Number(form.qaPercentile),
        notes: form.notes || null,
      };
      const res = await fetch("/api/mocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message ?? "Failed to log mock");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mocks"] });
      setOpen(false);
      setForm({
        mockName: "",
        mockDate: new Date().toISOString().split("T")[0]!,
        totalScore: "",
        overallPercentile: "",
        varcScore: "",
        varcPercentile: "",
        dilrScore: "",
        dilrPercentile: "",
        qaScore: "",
        qaPercentile: "",
        notes: "",
      });
      toast({ title: "Mock logged", tone: "success" });
    },
    onError: (err: Error) => {
      toast({ title: "Couldn't log mock", description: err.message, tone: "error" });
    },
  });

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-heading-1 text-ink tracking-tight">Progress</h1>
          <p className="text-body-sm text-ink-muted mt-1">
            Track your percentile trend and section-wise strength.
          </p>
        </div>
        <Modal open={open} onOpenChange={setOpen}>
          <ModalTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" /> Log mock
            </Button>
          </ModalTrigger>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>Log a mock score</ModalTitle>
              <ModalDescription>
                Enter the sectional breakdown from your test platform (IMS, TIME, etc.).
              </ModalDescription>
            </ModalHeader>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                addMock.mutate();
              }}
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="mockName">Mock name</Label>
                  <Input id="mockName" value={form.mockName} onChange={(e) => setField("mockName", e.target.value)} placeholder="SimCAT 12" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mockDate">Date</Label>
                  <Input id="mockDate" type="date" value={form.mockDate} onChange={(e) => setField("mockDate", e.target.value)} required />
                </div>
              </div>
              <div className="border-t border-hairline pt-3">
                <p className="text-eyebrow text-ink-muted uppercase mb-2">Overall</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="totalScore">Total score</Label>
                    <Input id="totalScore" type="number" step="0.5" min="0" max="300" value={form.totalScore} onChange={(e) => setField("totalScore", e.target.value)} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="overallPercentile">Overall percentile</Label>
                    <Input id="overallPercentile" type="number" step="0.01" min="0" max="100" value={form.overallPercentile} onChange={(e) => setField("overallPercentile", e.target.value)} required />
                  </div>
                </div>
              </div>
              {(["VARC", "DILR", "QA"] as const).map((sec) => {
                const scoreKey = `${sec.toLowerCase()}Score` as keyof typeof form;
                const pctKey = `${sec.toLowerCase()}Percentile` as keyof typeof form;
                return (
                  <div key={sec} className="border-t border-hairline pt-3">
                    <p className="text-eyebrow text-ink-muted uppercase mb-2">{sec}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor={scoreKey}>{sec} score</Label>
                        <Input id={scoreKey} type="number" step="0.5" min="0" max="100" value={form[scoreKey]} onChange={(e) => setField(scoreKey, e.target.value)} required />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={pctKey}>{sec} percentile</Label>
                        <Input id={pctKey} type="number" step="0.01" min="0" max="100" value={form[pctKey]} onChange={(e) => setField(pctKey, e.target.value)} required />
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className="flex justify-end gap-2 pt-2">
                <ModalClose asChild>
                  <Button type="button" variant="utility">Cancel</Button>
                </ModalClose>
                <Button type="submit" disabled={addMock.isPending}>
                  {addMock.isPending ? "Saving…" : "Save mock"}
                </Button>
              </div>
            </form>
          </ModalContent>
        </Modal>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Current Streak" value={`${streak.currentStreak}d`} caption={`Longest: ${streak.longestStreak}d`} icon={<Flame className="h-4 w-4" />} />
        <StatCard label="Total Completed" value={streak.totalCompleted} caption="Across all days" icon={<Target className="h-4 w-4" />} />
        <StatCard label="Mocks Logged" value={mocks.length} caption="All time" icon={<Award className="h-4 w-4" />} />
        <StatCard
          label="Latest Percentile"
          value={mocks.length > 0 ? `${mocks[mocks.length - 1]!.overallPercentile}` : "—"}
          caption={mocks.length > 0 ? mocks[mocks.length - 1]!.mockName : "Log your first mock"}
          icon={<TrendingUp className="h-4 w-4" />}
        />
      </div>

      {initialError ? (
        <div className="text-body-sm text-accent-orange-deep">Couldn't load existing mocks: {initialError}</div>
      ) : null}

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Percentile Trend</CardTitle>
            <CardDescription>Overall and sectional percentiles across mocks.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[280px] w-full" /> : <PercentileChart mocks={mocks} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Section Strength</CardTitle>
            <CardDescription>
              Average percentile per section.{" "}
              <span className="text-accent-orange-deep">Flagged</span> if below 80.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[240px] w-full" /> : <StreakChart mocks={mocks} />}
            {!isLoading && sections.length > 0 ? (
              <ul className="mt-4 space-y-1 text-body-sm">
                {sections.map((s) => (
                  <li key={s.section} className="flex items-center justify-between">
                    <span className="text-ink-secondary">{s.section}</span>
                    <span className={s.flagged ? "text-accent-orange-deep font-medium" : "text-ink"}>
                      {s.averagePercentile} {s.flagged ? "— needs work" : ""}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Daily Active Study Time History Log */}
      <DailyStudyLogCard />
    </div>
  );
}

function DailyStudyLogCard() {
  const [mounted, setMounted] = useState(false);
  const { getDailyLogEntries, getFormattedDuration, todayDateStr, autoPauseMinutes } = useActiveStudyStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  const entries = mounted ? getDailyLogEntries() : [];
  const pauseMinutes = autoPauseMinutes || 10;

  if (!mounted) {
    return (
      <Card className="mt-4">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Daily Active Study Logs</CardTitle>
              <CardDescription>
                Real active time spent studying on Shikhar. Auto-pauses after 10 minutes of inactivity.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="py-6 text-center text-xs text-ink-muted">Loading study history...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>Daily Active Study Logs</CardTitle>
            <CardDescription>
              Real active time spent studying on Shikhar. Auto-pauses after {pauseMinutes} minute{pauseMinutes > 1 ? "s" : ""} of inactivity.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {entries.map((entry) => {
            const isToday = entry.dateStr === todayDateStr;
            const targetSecs = 14400; // 4 hours target
            const percent = Math.min(100, Math.round((entry.seconds / targetSecs) * 100));

            return (
              <div key={entry.dateStr} className="p-3.5 rounded-xl border border-hairline bg-surface space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-ink-muted" />
                    <span className="font-bold text-ink text-sm">{entry.formattedDate}</span>
                    {isToday && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary text-on-primary">
                        Today
                      </span>
                    )}
                  </div>
                  <span className="font-mono font-extrabold text-sm text-primary">
                    {getFormattedDuration(entry.seconds)}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="h-2 w-full bg-hairline rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500 rounded-full"
                      style={{ width: `${percent}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[11px] text-ink-muted font-medium">
                    <span>Target: 4.0 hrs/day</span>
                    <span>{percent}% achieved</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
