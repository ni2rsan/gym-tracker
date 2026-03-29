"use client";

import { useState } from "react";
import { ChevronDown, Trophy } from "lucide-react";
import { ExerciseIcon } from "@/components/workout/ExerciseIcon";
import { cn, formatDate } from "@/lib/utils";
import type { ExerciseStatCard } from "@/lib/services/reportService";
import type { MuscleGroup } from "@/types";

type ChartFilter = 2 | 3 | 7;

const MAX_SETS = 3;

function SetBar({
  value,
  maxValue,
  unit,
  color,
  diff,
  positiveIsGood,
}: {
  value: number | null;
  maxValue: number;
  unit: string;
  color: string;
  diff: number | null;
  positiveIsGood: boolean;
}) {
  if (value == null) return <div className="h-3.5" />;
  const pct = maxValue > 0 ? Math.max(6, (value / maxValue) * 100) : 6;
  const display =
    unit === "kg"
      ? value % 1 === 0 ? `${value}` : value.toFixed(1)
      : `${value}`;
  const hasDiff = diff !== null && diff !== 0;
  const diffGood = hasDiff && (positiveIsGood ? diff! > 0 : diff! < 0);

  return (
    <div className="flex items-center gap-1 h-3.5">
      <div className="flex-1 h-1.5 bg-slate-700/60 rounded-full overflow-hidden min-w-0">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[9px] text-slate-300 tabular-nums shrink-0 w-[26px] text-right leading-none">
        {display}{unit}
      </span>
      <span
        className={cn(
          "text-[8px] font-bold tabular-nums shrink-0 w-[18px] text-left leading-none",
          hasDiff ? (diffGood ? "text-emerald-400" : "text-rose-400") : "invisible"
        )}
      >
        {hasDiff
          ? `${diff! > 0 ? "+" : ""}${
              unit === "kg"
                ? diff! % 1 === 0 ? diff : diff!.toFixed(1)
                : diff
            }`
          : "0"}
      </span>
    </div>
  );
}

function ExerciseChart({
  history,
  isBodyweight,
  isAssisted,
}: {
  history: ExerciseStatCard["history"];
  isBodyweight: boolean;
  isAssisted: boolean;
}) {
  const [filter, setFilter] = useState<ChartFilter>(2);

  const allData = history.filter((h) => h.sets.length > 0);
  const filtered = allData.slice(-filter);

  if (filtered.length < 1) return null;

  // Global max across all shown workouts for consistent bar scale
  const allReps = filtered.flatMap((h) =>
    h.sets.slice(0, MAX_SETS).map((s) => s.reps)
  );
  const allKg = isBodyweight
    ? []
    : filtered.flatMap((h) =>
        h.sets.slice(0, MAX_SETS).map((s) => s.weightKg ?? 0)
      );
  const maxReps = Math.max(...allReps, 1);
  const maxKg = isBodyweight ? 1 : Math.max(...allKg, 1);

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
          Sets · last workouts
        </span>
        <div className="flex gap-1">
          {([2, 3, 7] as ChartFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "text-[10px] font-semibold px-1.5 py-0.5 rounded-md transition-colors",
                filter === f
                  ? "bg-blue-500 text-white"
                  : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Workout columns — scrollable when many */}
      <div className="overflow-x-auto -mx-1 px-1">
        <div className="flex gap-2" style={{ minWidth: `${filtered.length * 108}px` }}>
          {filtered.map((workout, wIdx) => {
            const prev = wIdx > 0 ? filtered[wIdx - 1] : null;
            const sets = [...workout.sets]
              .sort((a, b) => a.setNumber - b.setNumber)
              .slice(0, MAX_SETS);
            const prevSets = prev
              ? [...prev.sets]
                  .sort((a, b) => a.setNumber - b.setNumber)
                  .slice(0, MAX_SETS)
              : null;

            return (
              <div
                key={workout.date}
                className="flex-1 rounded-xl bg-[#0c1222] p-2 space-y-2 min-w-0"
              >
                {/* Date */}
                <p className="text-center text-[9px] font-semibold text-slate-400 uppercase tracking-wide truncate">
                  {formatDate(workout.date)}
                </p>

                {/* Set rows */}
                {Array.from({ length: MAX_SETS }, (_, sIdx) => {
                  const set = sets[sIdx];
                  const prevSet = prevSets?.[sIdx] ?? null;

                  return (
                    <div key={sIdx} className="space-y-0.5">
                      <div className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">
                        S{sIdx + 1}
                      </div>
                      {set ? (
                        <>
                          <SetBar
                            value={set.reps}
                            maxValue={maxReps}
                            unit="r"
                            color="bg-blue-500"
                            diff={prevSet != null ? set.reps - prevSet.reps : null}
                            positiveIsGood={true}
                          />
                          {!isBodyweight && (
                            <SetBar
                              value={set.weightKg}
                              maxValue={maxKg}
                              unit="kg"
                              color="bg-amber-500"
                              diff={
                                prevSet != null &&
                                set.weightKg != null &&
                                prevSet.weightKg != null
                                  ? set.weightKg - prevSet.weightKg
                                  : null
                              }
                              positiveIsGood={!isAssisted}
                            />
                          )}
                        </>
                      ) : (
                        <div className="text-[9px] text-slate-700 h-3.5">—</div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
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
                            {card.history.length >= 1 && (
                              <ExerciseChart
                                history={card.history}
                                isBodyweight={card.isBodyweight}
                                isAssisted={card.isAssisted}
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
