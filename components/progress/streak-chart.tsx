"use client";

import * as React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { MockScore, NoteSection } from "@/lib/types";

/**
 * StreakChart — actually a section-strength bar chart.
 * Shows average percentile per section (VARC, DILR, QA) from logged mocks.
 * Per TRD: sections below 80th percentile are visually flagged (accent-orange).
 */

export interface StreakChartProps {
  mocks: MockScore[];
}

const sectionColors: Record<string, string> = {
  VARC: "#dd5b00",
  DILR: "#391c57",
  QA: "#2a9d99",
};

const FLAG_COLOR = "#dd5b00";

export function StreakChart({ mocks }: StreakChartProps) {
  const data = React.useMemo(() => {
    if (mocks.length === 0) return [];
    const sections: NoteSection[] = ["VARC", "DILR", "QA"];
    return sections.map((section) => {
      const key = `${section.toLowerCase()}Percentile` as keyof MockScore;
      const values = mocks.map((m) => m[key] as number);
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      return {
        section,
        average: Math.round(avg * 10) / 10,
        flagged: avg < 80,
      };
    });
  }, [mocks]);

  if (data.length === 0) {
    return (
      <div className="h-[240px] flex items-center justify-center text-body-sm text-ink-muted">
        Log a few mocks to see section-wise strength.
      </div>
    );
  }

  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 16, left: -8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e6e6e6" />
          <XAxis dataKey="section" tick={{ fontSize: 12, fill: "#615d59" }} stroke="#e6e6e6" />
          <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "#615d59" }} stroke="#e6e6e6" />
          <Tooltip
            contentStyle={{
              background: "#ffffff",
              border: "1px solid #e6e6e6",
              borderRadius: 8,
              fontSize: 13,
            }}
            formatter={(value: number) => [`${value} percentile`, "Avg"]}
          />
          <Bar dataKey="average" radius={[6, 6, 0, 0]} maxBarSize={64}>
            {data.map((entry) => (
              <Cell
                key={entry.section}
                fill={entry.flagged ? FLAG_COLOR : sectionColors[entry.section]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
