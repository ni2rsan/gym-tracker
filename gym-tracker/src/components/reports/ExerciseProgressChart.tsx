"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatDateShort } from "@/lib/utils";
import type { ExerciseSeriesData } from "@/lib/services/reportService";

const LINE_COLORS = [
  "#10b981", // emerald
  "#6366f1", // indigo
  "#f59e0b", // amber
  "#ef4444", // red
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f97316", // orange
];

interface ExerciseProgressChartProps {
  series: ExerciseSeriesData[];
}

export function ExerciseProgressChart({ series }: ExerciseProgressChartProps) {
  const nonEmpty = series.filter((s) => s.points.length > 0);

  if (nonEmpty.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-zinc-400 dark:text-zinc-500">
        No data for the selected exercises in this period.
      </div>
    );
  }

  // Merge all series onto a shared date axis
  const allDates = [...new Set(nonEmpty.flatMap((s) => s.points.map((p) => p.date)))].sort();

  const chartData = allDates.map((date) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const point: Record<string, any> = { date, label: formatDateShort(date) };
    for (const s of nonEmpty) {
      const dp = s.points.find((p) => p.date === date);
      point[s.exerciseId] = dp
        ? s.isBodyweight
          ? dp.maxReps
          : dp.maxWeight
        : null;
    }
    return point;
  });

  const yLabel = nonEmpty.some((s) => !s.isBodyweight) ? "kg" : "reps";

  return (
    <div>
      {/* Legend rendered above the chart so it never overlaps tooltips */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 px-1">
        {nonEmpty.map((s, i) => (
          <div key={s.exerciseId} className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: LINE_COLORS[i % LINE_COLORS.length] }}
            />
            {s.name}
          </div>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="currentColor"
            className="text-zinc-100 dark:text-zinc-800"
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "currentColor" }}
            className="text-zinc-400 dark:text-zinc-500"
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "currentColor" }}
            className="text-zinc-400 dark:text-zinc-500"
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}${yLabel}`}
            width={44}
          />
          <Tooltip
            contentStyle={{ borderRadius: "8px", border: "1px solid", fontSize: "12px" }}
            formatter={(value, name) => {
              const s = nonEmpty.find((s) => s.exerciseId === name);
              const unit = s?.isBodyweight ? " reps" : " kg";
              return [`${value ?? "—"}${unit}`, s?.name ?? String(name)];
            }}
          />
          {nonEmpty.map((s, i) => (
            <Line
              key={s.exerciseId}
              type="monotone"
              dataKey={s.exerciseId}
              name={s.exerciseId}
              stroke={LINE_COLORS[i % LINE_COLORS.length]}
              strokeWidth={2}
              dot={{ r: 4, fill: LINE_COLORS[i % LINE_COLORS.length], strokeWidth: 0 }}
              activeDot={{ r: 6 }}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
