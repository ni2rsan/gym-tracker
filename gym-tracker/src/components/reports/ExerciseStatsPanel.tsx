"use client";

import { useState } from "react";
import { ChevronDown, Trophy } from "lucide-react";
import { BarChart, Bar, Cell, ResponsiveContainer, YAxis, Tooltip } from "recharts";
import { ExerciseIcon } from "@/components/workout/ExerciseIcon";
import { cn, formatDate } from "@/lib/utils";
import type { ExerciseStatCard } from "@/lib/services/reportService";
import type { MuscleGroup } from "@/types";

type ChartFilter = 7 | 30 | "all";

function ExerciseChart({
  history,
  isBodyweight,
}: {
  history: ExerciseStatCard["history"];
  isBodyweight: boolean;
}) {
  const [filter, setFilter] = useState<ChartFilter>(30);

  const unit = isBodyweight ? "reps" : "kg";

  const allData = history
    .map((h) => ({
      v: isBodyweight ? (h.reps ?? 0) : (h.weightKg ?? 0),
      date: h.date,
    }))
    .filter((d) => d.v > 0);

  const filtered =
    filter === "all" ? allData : allData.slice(-filter);

  if (filtered.length < 2) return null;

  const values = filtered.map((d) => d.v);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  // Add a bit of padding below min so bars don't start at the very bottom edge
  const domainMin = Math.max(0, minVal - (maxVal - minVal) * 0.3);

  return (
    <div className="space-y-2">
      {/* Header row: label + filter pills */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
          Progress ({unit})
        </span>
        <div className="flex gap-1">
          {([7, 30, "all"] as ChartFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "text-[10px] font-semibold px-1.5 py-0.5 rounded-md transition-colors",
                filter === f
                  ? "bg-blue-600 text-white"
                  : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"
              )}
            >
              {f === "all" ? "All" : `${f}`}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={90}>
        <BarChart
          data={filtered}
          barCategoryGap={3}
          margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
        >
          <YAxis
            dataKey="v"
            domain={[domainMin, "auto"]}
            tick={{ fontSize: 9, fill: "#71717a" }}
            tickFormatter={(v: number) =>
              v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`
            }
            width={28}
            axisLine={false}
            tickLine={false}
            tickCount={3}
          />
          <Tooltip
            cursor={{ fill: "rgba(59,130,246,0.08)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const item = payload[0].payload as { v: number; date: string };
              return (
                <div className="bg-zinc-900 dark:bg-zinc-700 text-white text-[11px] px-2 py-1 rounded-lg shadow-lg">
                  <span className="font-semibold tabular-nums">
                    {item.v} {unit}
                  </span>
                  <span className="text-zinc-400 ml-1.5">{formatDate(item.date)}</span>
                </div>
              );
            }}
          />
          <Bar dataKey="v" radius={[3, 3, 0, 0]}>
            {filtered.map((_, i) => (
              <Cell
                key={i}
                fill={i === filtered.length - 1 ? "#1d4ed8" : "#3b82f6"}
                opacity={i === filtered.length - 1 ? 1 : 0.55 + (i / filtered.length) * 0.35}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const GROUP_LABELS: Record<string, string> = {
  UPPER_BODY: "Upper Body",
  LOWER_BODY: "Lower Body",
  BODYWEIGHT: "Bodyweight",
};
const GROUP_ORDER = ["UPPER_BODY", "LOWER_BODY", "BODYWEIGHT"];

interface ExerciseStatsPanelProps {
  cards: ExerciseStatCard[];
}

export function ExerciseStatsPanel({ cards }: ExerciseStatsPanelProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const byGroup = GROUP_ORDER.reduce<Record<string, ExerciseStatCard[]>>((acc, g) => {
    acc[g] = cards.filter((c) => c.muscleGroup === g);
    return acc;
  }, {});

  return (
    <div className="space-y-3">
      {GROUP_ORDER.map((group) => {
        const groupCards = byGroup[group];
        if (!groupCards || groupCards.length === 0) return null;
        const isCollapsed = collapsed[group];

        return (
          <div
            key={group}
            className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden"
          >
            <button
              onClick={() => setCollapsed((c) => ({ ...c, [group]: !c[group] }))}
              className="w-full px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between focus:outline-none"
            >
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                {GROUP_LABELS[group]}
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-zinc-400 transition-transform duration-200",
                  isCollapsed && "-rotate-90"
                )}
              />
            </button>

            {!isCollapsed && (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {groupCards.map((card) => {
                  const isExpanded = expanded[card.exerciseId];

                  // Primary metric display
                  let mainMetric = "—";
                  if (card.isBodyweight) {
                    mainMetric = card.latestReps ? `${card.latestReps} reps` : "—";
                  } else if (card.latestWeightKg !== null) {
                    mainMetric = `${card.latestWeightKg.toFixed(1)} kg`;
                    if (card.latestReps) mainMetric += ` × ${card.latestReps}`;
                  }

                  // Delta: prefer weight delta, fall back to reps delta
                  const rawDelta = !card.isBodyweight ? card.deltaWeightKg : card.deltaReps;
                  const deltaUnit = !card.isBodyweight ? " kg" : " rep";
                  const showDelta = rawDelta !== null && rawDelta !== 0;
                  // For assisted exercises lower is better, so flip the sign interpretation
                  const isImprovement = rawDelta !== null && (card.isAssisted ? rawDelta < 0 : rawDelta > 0);

                  return (
                    <div key={card.exerciseId}>
                      <button
                        className="w-full px-4 py-3 flex items-center gap-3 text-left focus:outline-none active:bg-zinc-50 dark:active:bg-zinc-800/50"
                        onClick={() =>
                          setExpanded((e) => ({ ...e, [card.exerciseId]: !e[card.exerciseId] }))
                        }
                      >
                        {/* Icon */}
                        <div className="w-7 h-7 shrink-0">
                          <ExerciseIcon
                            name={card.exerciseName}
                            muscleGroup={card.muscleGroup as MuscleGroup}
                            className="w-full h-full"
                          />
                        </div>

                        {/* Name + date */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate capitalize">
                            {card.exerciseName.toLowerCase()}
                          </p>
                          {card.latestDate && (
                            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-tight">
                              {formatDate(card.latestDate)}
                            </p>
                          )}
                        </div>

                        {/* Latest metric + indicators */}
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-bold text-zinc-900 dark:text-white tabular-nums">
                            {mainMetric}
                          </p>
                          <div className="flex items-center justify-end gap-1 mt-0.5 min-h-[16px]">
                            {showDelta && (
                              <span
                                className={cn(
                                  "text-[11px] font-semibold tabular-nums",
                                  isImprovement ? "text-emerald-500" : "text-rose-500"
                                )}
                              >
                                {isImprovement ? "↑" : "↓"}{" "}
                                {Math.abs(rawDelta!).toFixed(rawDelta! % 1 === 0 ? 0 : 1)}
                                {deltaUnit}
                              </span>
                            )}
                            {card.isPR && (
                              <Trophy className="h-3 w-3 text-amber-500 shrink-0" />
                            )}
                          </div>
                        </div>

                        {/* Expand chevron */}
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 text-zinc-300 dark:text-zinc-600 transition-transform duration-150 shrink-0",
                            isExpanded && "rotate-180"
                          )}
                        />
                      </button>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div className="px-4 pb-3 pl-14">
                          <div className="bg-zinc-50 dark:bg-zinc-800/60 rounded-xl px-3 py-2.5 space-y-2">
                            {/* Progress chart with filter */}
                            {card.history.length >= 2 && (
                              <ExerciseChart
                                history={card.history}
                                isBodyweight={card.isBodyweight}
                              />
                            )}
                            <div className="space-y-1.5 pt-0.5">
                              <div className="flex justify-between text-xs">
                                <span className="text-zinc-500 dark:text-zinc-400">Total sets</span>
                                <span className="font-semibold text-zinc-700 dark:text-zinc-300 tabular-nums">
                                  {card.totalSets}
                                </span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-zinc-500 dark:text-zinc-400">In workouts</span>
                                <span className="font-semibold text-zinc-700 dark:text-zinc-300 tabular-nums">
                                  {card.totalWorkouts}
                                </span>
                              </div>
                              {(card.prWeightKg !== null || card.prReps !== null) && (
                                <div className="flex justify-between text-xs pt-0.5 border-t border-zinc-200 dark:border-zinc-700">
                                  <span className="text-zinc-500 dark:text-zinc-400">Personal record</span>
                                  <span className="font-semibold text-amber-500 tabular-nums">
                                    {card.isBodyweight
                                      ? `${card.prReps} reps`
                                      : card.prWeightKg !== null
                                        ? `${card.prWeightKg.toFixed(1)} kg × ${card.prReps}`
                                        : "—"}
                                  </span>
                                </div>
                              )}
                              {card.prDate && (
                                <div className="flex justify-between text-xs">
                                  <span className="text-zinc-500 dark:text-zinc-400">PR date</span>
                                  <span className="text-zinc-400 dark:text-zinc-500">
                                    {formatDate(card.prDate)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
