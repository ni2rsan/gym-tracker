"use client";

import { X, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ExerciseIcon } from "./ExerciseIcon";
import { MUSCLE_GROUP_LABELS } from "@/constants/exercises";
import { computeSetDiffs, computeOutcome } from "@/lib/workoutDiff";
import type { PrevSet, CurrSet } from "@/lib/workoutDiff";
import type { MuscleGroup } from "@/types";

export interface SummaryExerciseData {
  exerciseId: string;
  name: string;
  muscleGroup: MuscleGroup | string;
  isBodyweight: boolean;
  isPR: boolean;
  prevSets: PrevSet[];
  currentSets: { setNumber: number; reps: number | string; weightKg: number | string | null }[];
}

interface WorkoutSummaryModalProps {
  title?: string;
  exercises: SummaryExerciseData[];
  onClose: () => void;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
}

function fmt(v: number) {
  return parseFloat(v.toFixed(1));
}

function DiffBadge({ value, unit }: { value: number; unit: string }) {
  if (value === 0) return null;
  const positive = value > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center text-[9px] font-bold px-1 py-px rounded",
        positive
          ? "text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/40"
          : "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/40"
      )}
    >
      {positive ? `▲+${fmt(value)}` : `▼${fmt(Math.abs(value))}`}{unit}
    </span>
  );
}

export function WorkoutSummaryModal({
  title = "Session Summary",
  exercises,
  onClose,
  primaryActionLabel,
  onPrimaryAction,
}: WorkoutSummaryModalProps) {
  const exerciseData = exercises.map((ex) => {
    const diffs = computeSetDiffs(ex.prevSets, ex.currentSets as CurrSet[]);
    const { allPositive, allNegative } = computeOutcome(diffs, ex.isBodyweight);
    const outcome: "pr" | "positive" | "negative" | null =
      ex.isPR ? "pr" : allPositive ? "positive" : allNegative ? "negative" : null;
    return { ...ex, diffs, allPositive, allNegative, outcome };
  });

  const prCount = exerciseData.filter((e) => e.outcome === "pr").length;
  const improvedCount = exerciseData.filter((e) => e.outcome === "positive").length;
  const declinedCount = exerciseData.filter((e) => e.outcome === "negative").length;

  const totalVolume = exercises.reduce((acc, ex) => {
    return acc + ex.currentSets.reduce((sum, s) => {
      const kg = s.weightKg !== null && s.weightKg !== "" ? Number(s.weightKg) : 0;
      return sum + kg * Number(s.reps);
    }, 0);
  }, 0);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-3 shrink-0 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-0.5">
              {title}
            </p>
            <p className="text-xl font-bold text-zinc-900 dark:text-white">
              {exercises.length} exercise{exercises.length !== 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              {prCount > 0 && (
                <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                  🏆 {prCount} PR{prCount !== 1 ? "s" : ""}
                </span>
              )}
              {improvedCount > 0 && (
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="h-3 w-3" strokeWidth={2.5} /> {improvedCount}
                </span>
              )}
              {declinedCount > 0 && (
                <span className="flex items-center gap-1 text-xs font-semibold text-red-500 dark:text-red-400">
                  <TrendingDown className="h-3 w-3" strokeWidth={2.5} /> {declinedCount}
                </span>
              )}
              {totalVolume > 0 && (
                <span className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">
                  {totalVolume.toLocaleString()} kg vol
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 ml-3 mt-0.5 shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Per-exercise list */}
        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {exerciseData.map((ex) => {
            const isFirstTime = ex.prevSets.length === 0;
            return (
              <div key={ex.exerciseId} className="rounded-xl bg-zinc-50 dark:bg-zinc-800/60 overflow-hidden">
                {/* Exercise header */}
                <div className="flex items-center gap-2.5 px-3 py-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white dark:bg-zinc-700 shadow-sm">
                    <ExerciseIcon name={ex.name} muscleGroup={ex.muscleGroup as MuscleGroup} className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 leading-tight truncate">
                      {ex.name.charAt(0) + ex.name.slice(1).toLowerCase()}
                    </p>
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">
                      {MUSCLE_GROUP_LABELS[ex.muscleGroup as MuscleGroup] ?? ex.muscleGroup}
                    </p>
                  </div>
                  {ex.outcome === "pr" && <span className="text-sm leading-none shrink-0">🏆</span>}
                  {ex.outcome === "positive" && (
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-500 shrink-0" strokeWidth={2.5} />
                  )}
                  {ex.outcome === "negative" && (
                    <TrendingDown className="h-3.5 w-3.5 text-red-500 shrink-0" strokeWidth={2.5} />
                  )}
                </div>

                {/* Set rows */}
                <div className="px-3 pb-3 space-y-1.5">
                  {isFirstTime ? (
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 italic text-center py-1">
                      First time — no previous data
                    </p>
                  ) : (
                    ex.diffs.map((d) => {
                      const hasPrev = !d.isNewSet;
                      const hasCurr = !d.isDropped;

                      return (
                        <div
                          key={d.setNumber}
                          className={cn(
                            "flex items-center gap-2 rounded-lg px-2 py-1.5",
                            "bg-white dark:bg-zinc-900/60",
                            d.isDropped && "opacity-40"
                          )}
                        >
                          {/* Set label */}
                          <span className="w-5 shrink-0 text-[10px] font-semibold text-zinc-400 dark:text-zinc-500">
                            S{d.setNumber}
                          </span>

                          {hasCurr ? (
                            <div className="flex-1 flex items-center gap-1.5 flex-wrap">
                              {/* Reps: current value + diff badge inline */}
                              <span className="flex items-center gap-1">
                                <span className="text-sm font-bold text-zinc-800 dark:text-zinc-100 tabular-nums">
                                  {d.currReps}
                                </span>
                                <span className="text-[10px] text-zinc-400">r</span>
                                {d.diffReps !== null && d.diffReps !== 0 && (
                                  <DiffBadge value={d.diffReps} unit="r" />
                                )}
                              </span>

                              {/* kg: current value + diff badge inline (weighted only) */}
                              {!ex.isBodyweight && (
                                <>
                                  <span className="text-[10px] text-zinc-300 dark:text-zinc-600">·</span>
                                  <span className="flex items-center gap-1">
                                    <span className="text-sm font-bold text-zinc-800 dark:text-zinc-100 tabular-nums">
                                      {d.currKg}
                                    </span>
                                    <span className="text-[10px] text-zinc-400">kg</span>
                                    {d.diffKg !== null && d.diffKg !== 0 && (
                                      <DiffBadge value={d.diffKg} unit="kg" />
                                    )}
                                  </span>
                                </>
                              )}
                            </div>
                          ) : (
                            <span className="flex-1 text-[10px] text-zinc-400 italic">dropped</span>
                          )}

                          {/* Previous value — right-aligned, small and muted */}
                          {hasPrev && hasCurr && (
                            <span className="shrink-0 text-[9px] text-zinc-400 dark:text-zinc-600 tabular-nums">
                              {ex.isBodyweight
                                ? `was ${d.prevReps}r`
                                : `was ${d.prevReps}r · ${d.prevKg}kg`}
                            </span>
                          )}
                          {d.isNewSet && (
                            <span className="shrink-0 text-[9px] text-zinc-400 bg-zinc-100 dark:bg-zinc-800 rounded px-1 py-px">
                              new
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}

                  {!isFirstTime && ex.allPositive && (
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 text-center font-medium pt-0.5">
                      💪 Great work!
                    </p>
                  )}
                  {!isFirstTime && ex.allNegative && (
                    <p className="text-[10px] text-red-500 dark:text-red-400 text-center font-medium pt-0.5">
                      🔥 Keep fighting!
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Action buttons */}
        <div className="px-5 pb-5 shrink-0 flex flex-col gap-2 border-t border-zinc-100 dark:border-zinc-800 pt-4">
          {primaryActionLabel && onPrimaryAction && (
            <button
              onClick={onPrimaryAction}
              className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-600 py-3 text-sm font-bold text-white transition-colors"
            >
              {primaryActionLabel}
            </button>
          )}
          <button
            onClick={onClose}
            className={cn(
              "w-full rounded-xl py-2.5 text-sm font-semibold transition-colors",
              primaryActionLabel
                ? "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
                : "bg-emerald-500 hover:bg-emerald-600 text-white"
            )}
          >
            {primaryActionLabel ? "Close" : "Done"}
          </button>
        </div>
      </div>
    </div>
  );
}
