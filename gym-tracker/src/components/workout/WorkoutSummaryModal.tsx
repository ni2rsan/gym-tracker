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
  /** If provided, renders a prominent CTA button (e.g. "Finish Workout") */
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
}

function fmt(v: number) {
  return parseFloat(v.toFixed(1));
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
            {/* Stats row */}
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
                  {totalVolume.toLocaleString()} kg
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
              <div key={ex.exerciseId} className="rounded-xl bg-zinc-50 dark:bg-zinc-800 overflow-hidden">
                {/* Exercise header */}
                <div className="flex items-center gap-2.5 px-3 py-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white dark:bg-zinc-700">
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
                  {ex.outcome === "pr" && (
                    <span className="text-sm leading-none shrink-0">🏆</span>
                  )}
                  {ex.outcome === "positive" && (
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-500 shrink-0" strokeWidth={2.5} />
                  )}
                  {ex.outcome === "negative" && (
                    <TrendingDown className="h-3.5 w-3.5 text-red-500 shrink-0" strokeWidth={2.5} />
                  )}
                </div>

                {/* Set comparison table */}
                <div className="px-3 pb-3">
                  {isFirstTime ? (
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 italic text-center pb-1">
                      First time — no previous data to compare
                    </p>
                  ) : (
                    <>
                      <div className="grid grid-cols-4 gap-1 mb-1">
                        {["S#", "Prev", "Today", "Diff"].map((h) => (
                          <span
                            key={h}
                            className="text-[9px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide text-center"
                          >
                            {h}
                          </span>
                        ))}
                      </div>
                      <div className="space-y-1">
                        {ex.diffs.map((d) => {
                          const prevLabel = d.isNewSet
                            ? "—"
                            : ex.isBodyweight
                            ? `${d.prevReps}r`
                            : `${d.prevReps}r · ${d.prevKg}kg`;
                          const currLabel = d.isDropped
                            ? "—"
                            : ex.isBodyweight
                            ? `${d.currReps}r`
                            : `${d.currReps}r · ${d.currKg}kg`;

                          const parts: string[] = [];
                          if (!d.isNewSet && !d.isDropped) {
                            if (d.diffReps !== null && d.diffReps !== 0)
                              parts.push(`${d.diffReps > 0 ? "▲+" : "▼"}${fmt(d.diffReps)}r`);
                            if (!ex.isBodyweight && d.diffKg !== null && d.diffKg !== 0)
                              parts.push(`${d.diffKg > 0 ? "▲+" : "▼"}${fmt(d.diffKg)}kg`);
                          }

                          const isPos =
                            !d.isNewSet &&
                            !d.isDropped &&
                            (d.diffReps ?? 0) >= 0 &&
                            (d.diffKg ?? 0) >= 0;

                          const diffEl = d.isNewSet ? (
                            <span className="text-zinc-400 text-[9px]">new</span>
                          ) : d.isDropped ? (
                            <span className="text-zinc-400 text-[9px]">—</span>
                          ) : parts.length === 0 ? (
                            <span className="text-zinc-300 dark:text-zinc-600 text-[9px]">=</span>
                          ) : (
                            <span
                              className={cn(
                                "text-[9px] font-medium",
                                isPos
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-red-500 dark:text-red-400"
                              )}
                            >
                              {parts.join(" ")}
                            </span>
                          );

                          return (
                            <div
                              key={d.setNumber}
                              className={cn(
                                "grid grid-cols-4 gap-1 items-center",
                                d.isDropped && "opacity-50"
                              )}
                            >
                              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 text-center font-medium">
                                S{d.setNumber}
                              </span>
                              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 text-center">
                                {prevLabel}
                              </span>
                              <span className="text-[10px] text-zinc-800 dark:text-zinc-200 text-center font-medium">
                                {currLabel}
                              </span>
                              <span className="text-center">{diffEl}</span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                  {!isFirstTime && ex.allPositive && (
                    <p className="mt-2 text-[10px] text-emerald-600 dark:text-emerald-400 text-center font-medium">
                      💪 Great work!
                    </p>
                  )}
                  {!isFirstTime && ex.allNegative && (
                    <p className="mt-2 text-[10px] text-red-500 dark:text-red-400 text-center font-medium">
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
