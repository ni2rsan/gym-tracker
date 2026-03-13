"use client";

import { useState } from "react";
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

type SecondaryMode = "bodyFatPct" | "composition";

interface WeightTrendChartProps {
  data: MetricPoint[];
  isWithingsConnected: boolean;
}

export function WeightTrendChart({ data, isWithingsConnected }: WeightTrendChartProps) {
  const hasBodyFatData = data.some((d) => d.bodyFatPct != null);
  const hasCompositionData = isWithingsConnected;

  const defaultMode: SecondaryMode = hasBodyFatData ? "bodyFatPct" : "composition";
  const [secondaryMode, setSecondaryMode] = useState<SecondaryMode>(defaultMode);
  const [showWeight, setShowWeight] = useState(true);
  const [showSecondary, setShowSecondary] = useState(hasBodyFatData || hasCompositionData);

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
  }));

  const hasWeight = showWeight && data.some((d) => d.weightKg != null);
  const hasBF = secondaryMode === "bodyFatPct" && showSecondary && data.some((d) => d.bodyFatPct != null);
  const hasFatMass = secondaryMode === "composition" && showSecondary && data.some((d) => d.fatMassKg != null);
  const hasMuscleMass = secondaryMode === "composition" && showSecondary && data.some((d) => d.muscleMassKg != null);
  const hasAnySecondary = hasBF || hasFatMass || hasMuscleMass;

  // Dynamic weight domain
  const weights = data.map((d) => d.weightKg).filter((v): v is number => v != null);
  const weightMin = weights.length ? Math.floor(Math.min(...weights) - 2) : 60;
  const weightMax = weights.length ? Math.ceil(Math.max(...weights) + 2) : 100;

  // Dynamic right-axis domain
  const rightValues: number[] = [];
  if (secondaryMode === "bodyFatPct") {
    data.forEach((d) => { if (d.bodyFatPct != null) rightValues.push(d.bodyFatPct); });
  } else {
    data.forEach((d) => {
      if (d.fatMassKg != null) rightValues.push(d.fatMassKg);
      if (d.muscleMassKg != null) rightValues.push(d.muscleMassKg);
    });
  }
  const rightMin = rightValues.length ? Math.floor(Math.min(...rightValues) - 2) : 0;
  const rightMax = rightValues.length ? Math.ceil(Math.max(...rightValues) + 2) : 50;
  const rightUnit = secondaryMode === "bodyFatPct" ? "%" : "kg";

  const secondaryLabel = secondaryMode === "bodyFatPct" ? "Body Fat %" : "Fat + Muscle";

  return (
    <div className="flex flex-col gap-3">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Secondary metric selector — only show available modes */}
        {(hasBodyFatData || hasCompositionData) && (
          <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden text-xs">
            {hasBodyFatData && (
              <button
                onClick={() => setSecondaryMode("bodyFatPct")}
                className={`px-2.5 py-1.5 font-medium transition-colors ${
                  secondaryMode === "bodyFatPct"
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                }`}
              >
                Body Fat %
              </button>
            )}
            {hasCompositionData && (
              <button
                onClick={() => setSecondaryMode("composition")}
                className={`px-2.5 py-1.5 font-medium transition-colors ${
                  secondaryMode === "composition"
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                }`}
              >
                Fat + Muscle
              </button>
            )}
          </div>
        )}

        {/* Series visibility toggles */}
        <div className="flex items-center gap-1.5 ml-auto">
          <button
            onClick={() => setShowWeight((v) => !v)}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-medium border transition-colors ${
              showWeight
                ? "border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-200"
                : "border-zinc-200 dark:border-zinc-700 text-zinc-400"
            }`}
          >
            Weight
          </button>
          {(hasBodyFatData || hasCompositionData) && (
            <button
              onClick={() => setShowSecondary((v) => !v)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium border transition-colors ${
                showSecondary
                  ? "border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-200"
                  : "border-zinc-200 dark:border-zinc-700 text-zinc-400"
              }`}
            >
              {secondaryLabel}
            </button>
          )}
        </div>
      </div>

      {/* Chart */}
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
              domain={[weightMin, weightMax]}
              tick={{ fontSize: 11, fill: "currentColor" }}
              className="text-zinc-400 dark:text-zinc-500"
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}kg`}
              width={48}
            />
          )}
          {hasAnySecondary && (
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[rightMin, rightMax]}
              tick={{ fontSize: 11, fill: "currentColor" }}
              className="text-zinc-400 dark:text-zinc-500"
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}${rightUnit}`}
              width={44}
            />
          )}
          <Tooltip
            contentStyle={{ borderRadius: "8px", border: "1px solid", fontSize: "12px" }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any, name?: any) => {
              if (name === "weightKg") return [`${value ?? "—"} kg`, "Weight"];
              if (name === "bodyFatPct") return [`${value ?? "—"}%`, "Body Fat"];
              if (name === "fatMassKg") return [`${value ?? "—"} kg`, "Fat Mass"];
              if (name === "muscleMassKg") return [`${value ?? "—"} kg`, "Muscle Mass"];
              return [value, name];
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: "12px" }}
            formatter={(value) => {
              if (value === "weightKg") return "Weight (kg)";
              if (value === "bodyFatPct") return "Body Fat (%)";
              if (value === "fatMassKg") return "Fat Mass (kg)";
              if (value === "muscleMassKg") return "Muscle Mass (kg)";
              return value;
            }}
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
          {hasFatMass && (
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="fatMassKg"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ r: 3, fill: "#f59e0b" }}
              activeDot={{ r: 5 }}
              connectNulls
            />
          )}
          {hasMuscleMass && (
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="muscleMassKg"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={{ r: 3, fill: "#8b5cf6" }}
              activeDot={{ r: 5 }}
              connectNulls
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
