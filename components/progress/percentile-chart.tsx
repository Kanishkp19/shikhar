"use client";

import * as React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { MockScore } from "@/lib/types";
import { formatShortDate } from "@/lib/utils";

/**
 * PercentileChart — line chart of overall + sectional percentiles across mocks.
 * Per TRD: fewer than 2 mocks → single-point state, not an error.
 */

export interface PercentileChartProps {
  mocks: MockScore[];
}

export function PercentileChart({ mocks }: PercentileChartProps) {
  const sorted = React.useMemo(
    () => [...mocks].sort((a, b) => a.mockDate.localeCompare(b.mockDate)),
    [mocks],
  );

  const data = sorted.map((m) => ({
    name: formatShortDate(m.mockDate),
    Overall: m.overallPercentile,
    VARC: m.varcPercentile,
    DILR: m.dilrPercentile,
    QA: m.qaPercentile,
  }));

  if (data.length === 0) {
    return (
      <div className="h-[280px] flex items-center justify-center text-body-sm text-ink-muted">
        Log your first mock score to see the percentile trend.
      </div>
    );
  }

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 16, left: -8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e6e6e6" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12, fill: "#615d59" }}
            stroke="#e6e6e6"
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 12, fill: "#615d59" }}
            stroke="#e6e6e6"
          />
          <Tooltip
            contentStyle={{
              background: "#ffffff",
              border: "1px solid #e6e6e6",
              borderRadius: 8,
              fontSize: 13,
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          />
          <Line
            type="monotone"
            dataKey="Overall"
            stroke="#0075de"
            strokeWidth={2.5}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="VARC"
            stroke="#dd5b00"
            strokeWidth={1.5}
            dot={{ r: 2 }}
          />
          <Line
            type="monotone"
            dataKey="DILR"
            stroke="#391c57"
            strokeWidth={1.5}
            dot={{ r: 2 }}
          />
          <Line
            type="monotone"
            dataKey="QA"
            stroke="#2a9d99"
            strokeWidth={1.5}
            dot={{ r: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
