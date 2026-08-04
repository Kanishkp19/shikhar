"use client";

import { Search, X } from "lucide-react";

interface SectionFilterBarProps {
  selectedSection: string;
  onSelectSection: (section: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const SECTIONS: Array<{ label: string; value: string; color?: string }> = [
  { label: "All", value: "ALL" },
  { label: "QA", value: "QA", color: "var(--color-accent-teal)" },
  { label: "DILR", value: "DILR", color: "var(--color-accent-purple)" },
  { label: "VARC", value: "VARC", color: "var(--color-accent-orange)" },
  { label: "MOCK", value: "MOCK", color: "var(--color-accent-pink)" },
  { label: "REVIEW", value: "REVIEW", color: "var(--color-accent-sky)" },
];

export function SectionFilterBar({
  selectedSection,
  onSelectSection,
  searchQuery,
  onSearchChange,
}: SectionFilterBarProps) {
  return (
    <div className="bg-white rounded-[12px] border border-[var(--color-hairline)] p-4 shadow-[var(--shadow-1)] space-y-3">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]" />
          <input
            type="text"
            placeholder="Search topic or concept across 121 days..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-[var(--color-canvas-soft)] border border-[#dddddd] rounded-[8px] pl-9 pr-8 py-2 text-sm text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary)]"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Section Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {SECTIONS.map((sec) => {
            const isSelected = selectedSection === sec.value;
            return (
              <button
                key={sec.value}
                onClick={() => onSelectSection(sec.value)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider transition-all ${
                  isSelected
                    ? "bg-[var(--color-ink)] text-white shadow-sm"
                    : "bg-[var(--color-canvas-soft)] text-[var(--color-ink-secondary)] hover:bg-black/[0.06]"
                }`}
              >
                {sec.color && (
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: sec.color }}
                  />
                )}
                {sec.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
