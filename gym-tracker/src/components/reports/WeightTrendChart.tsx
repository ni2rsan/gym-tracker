"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatDateShort } from "@/lib/utils";
import type { MetricPoint } from "@/types";

interface WeightTrendChartProps {
  data: MetricPoint[];
}

export function WeightTrendChart({ data }: WeightTrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-zinc-400 dark:text-zinc-500">
        No weight data yet. Log your body metrics on the Workout page.
      </div>
    );
  }

  const formatted = data.map((d) => ({
    ...d,
    label: formatDateShort(d.date),
    weightKg: d.weightKg,
    bodyFatPct: d.bodyFatPct,
  }));

  const hasWeight = data.some((d) => d.weightKg != null);
  const hasBF = data.some((d) => d.bodyFatPct != null);

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={formatted} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-zinc-100 dark:text-zinc-800" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "currentColor" }}
          className="text-zinc-400 dark:text-zinc-500"
          tickLine={false}
        />
        {hasWeight && (
          <YAxis
            yAxisId="left"
            domain={[65, 95]}
            tick={{ fontSize: 11, fill: "currentColor" }}
            className="text-zinc-400 dark:text-zinc-500"
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}kg`}
            width={48}
          />
        )}
        {hasBF && (
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[10, 35]}
            tick={{ fontSize: 11, fill: "currentColor" }}
            className="text-zinc-400 dark:text-zinc-500"
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}%`}
            width={40}
          />
        )}
        <Tooltip
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid",
            fontSize: "12px",
          }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(value: any, name?: any) =>
            name === "weightKg" ? [`${value ?? "—"} kg`, "Weight"] : [`${value ?? "—"}%`, "Body Fat"]
          }
        />
        <Legend
          wrapperStyle={{ fontSize: "12px" }}
          formatter={(value) => (value === "weightKg" ? "Weight (kg)" : "Body Fat (%)")}
        />
        {hasWeight && (
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="weightKg"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ r: 3, fill: "#10b981" }}
            activeDot={{ r: 5 }}
            connectNulls
          />
        )}
        {hasBF && (
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="bodyFatPct"
            stroke="#6366f1"
            strokeWidth={2}
            dot={{ r: 3, fill: "#6366f1" }}
            activeDot={{ r: 5 }}
            connectNulls
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
