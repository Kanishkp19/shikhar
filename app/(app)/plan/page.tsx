"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SectionFilterBar } from "@/components/plan/section-filter-bar";
import { DayAccordion } from "@/components/plan/day-accordion";
import { todayISODate } from "@/lib/utils";
import { Search } from "lucide-react";

interface PlanTask {
  id: string;
  section: "QA" | "DILR" | "VARC" | "MOCK" | "REVIEW";
  title: string;
  scheduled_time: string | null;
  duration_minutes: number;
  completed: boolean;
}

interface PlanDay {
  day_number: number;
  date: string;
  tasks: PlanTask[];
}

export default function PlanExplorerPage() {
  const [selectedSection, setSelectedSection] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const todayStr = todayISODate();

  const { data, isLoading, isError, refetch } = useQuery<{ data: PlanDay[] }>({
    queryKey: ["plan", selectedSection, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedSection !== "ALL") params.set("section", selectedSection);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      const res = await fetch(`/api/plan?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch plan");
      return res.json();
    },
  });

  const planDays = data?.data ?? [];

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-eyebrow text-ink-muted uppercase tracking-wide">
            121-Day Master Curriculum · Aug 1 → Nov 29
          </p>
          <h1 className="text-heading-1 text-ink tracking-tight mt-1">Plan Explorer</h1>
          <p className="text-body-sm text-ink-muted mt-1">
            Browse all 121 days of CAT 2026 prep. Select any topic to set it as active.
          </p>
        </div>
      </header>

      {/* Filter Bar */}
      <SectionFilterBar
        selectedSection={selectedSection}
        onSelectSection={setSelectedSection}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Days Accordion List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="h-16 bg-black/[0.06] rounded-[12px] animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <div className="bg-white rounded-[12px] border border-[var(--color-danger)] p-8 text-center space-y-3">
          <p className="text-base text-[var(--color-danger)] font-medium">
            Failed to load curriculum plan.
          </p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-[var(--color-primary)] text-white text-xs font-semibold rounded-full hover:opacity-90 transition-all"
          >
            Try Again
          </button>
        </div>
      ) : planDays.length === 0 ? (
        <div className="bg-white rounded-[12px] border border-[var(--color-hairline)] p-12 text-center space-y-3">
          <Search className="w-8 h-8 text-[var(--color-ink-faint)] mx-auto" />
          <p className="text-base text-[var(--color-ink-muted)] font-medium">
            No topics found matching your filters.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {planDays.map((day) => (
            <DayAccordion
              key={day.day_number}
              dayNumber={day.day_number}
              dateStr={day.date}
              isToday={day.date === todayStr}
              tasks={day.tasks}
            />
          ))}
        </div>
      )}
    </div>
  );
}