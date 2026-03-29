"use client";

import { useState } from "react";
import { ChevronDown, Trophy } from "lucide-react";
import { BarChart, Bar, Cell, ResponsiveContainer } from "recharts";
import { ExerciseIcon } from "@/components/workout/ExerciseIcon";
import { cn, formatDate } from "@/lib/utils";
import type { ExerciseStatCard } from "@/lib/services/reportService";
import type { MuscleGroup } from "@/types";

function MiniBarChart({ history, isBodyweight }: {
  history: ExerciseStatCard["history"];
  isBodyweight: boolean;
}) {
  const chartData = history
    .map((h) => ({ v: isBodyweight ? (h.reps ?? 0) : (h.weightKg ?? 0) }))
    .filter((d) => d.v > 0);
  if (chartData.length < 2) return null;
  return (
    <ResponsiveContainer width="100%" height={36}>
      <BarChart data={chartData} barCategoryGap={2} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <Bar dataKey="v" radius={[2, 2, 0, 0]}>
          {chartData.map((_, i) => (
            <Cell
              key={i}
              fill={i === chartData.length - 1 ? "#f59e0b" : "#d4d4d8"}
              className="dark:fill-zinc-600"
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
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
                          <div className="bg-zinc-50 dark:bg-zinc-800/60 rounded-xl px-3 py-2.5 space-y-1.5">
                            {/* Mini progress chart */}
                            {card.history.length >= 2 && (
                              <div className="pb-1">
                                <MiniBarChart history={card.history} isBodyweight={card.isBodyweight} />
                              </div>
                            )}
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
