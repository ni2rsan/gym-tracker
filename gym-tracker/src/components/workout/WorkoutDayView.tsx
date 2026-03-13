"use client";

import { cn } from "@/lib/utils";
import { ExerciseIcon } from "./ExerciseIcon";
import { MUSCLE_GROUP_LABELS, MUSCLE_GROUP_ORDER } from "@/constants/exercises";
import type { ExerciseWithSettings, SetData, MuscleGroup } from "@/types";

interface WorkoutDayViewProps {
  exercises: ExerciseWithSettings[];
  workoutData: Record<string, SetData[]>;
  onTrack?: (mg: MuscleGroup) => void;
}

const GROUP_COLORS: Record<MuscleGroup, string> = {
  UPPER_BODY: "text-blue-500 dark:text-blue-400",
  LOWER_BODY: "text-green-600 dark:text-green-400",
  BODYWEIGHT: "text-purple-500 dark:text-purple-400",
  CARDIO: "text-rose-500 dark:text-rose-400",
};

const GROUP_BG: Record<MuscleGroup, string> = {
  UPPER_BODY: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/50",
  LOWER_BODY: "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800/50",
  BODYWEIGHT: "bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800/50",
  CARDIO: "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/50",
};

function formatSets(sets: SetData[], isBodyweight: boolean, isCardio: boolean): string {
  const nonEmpty = sets.filter((s) => Number(s.reps) > 0);
  if (nonEmpty.length === 0) return "Not tracked";
  if (isCardio) {
    const total = nonEmpty.reduce((sum, s) => sum + Number(s.reps), 0);
    return `${total} min`;
  }
  return nonEmpty
    .map((s) => {
      const reps = Number(s.reps);
      const kg = s.weightKg !== "" && s.weightKg != null ? Number(s.weightKg) : null;
      if (isBodyweight || kg === null) return `${reps} reps`;
      return `${reps}×${kg}kg`;
    })
    .join("  ·  ");
}

export function WorkoutDayView({ exercises, workoutData, onTrack }: WorkoutDayViewProps) {
  const exercisesByGroup = MUSCLE_GROUP_ORDER.reduce((acc, mg) => {
    acc[mg] = exercises.filter((e) => e.muscleGroup === mg);
    return acc;
  }, {} as Record<MuscleGroup, ExerciseWithSettings[]>);

  return (
    <div className="space-y-4">
      {MUSCLE_GROUP_ORDER.map((mg) => {
        const groupExercises = exercisesByGroup[mg];
        if (groupExercises.length === 0) return null;

        const trackedCount = groupExercises.filter((ex) => {
          const sets = workoutData[ex.id] ?? [];
          return sets.some((s) => Number(s.reps) > 0);
        }).length;

        return (
          <div key={mg} className={cn("rounded-xl border overflow-hidden", GROUP_BG[mg])}>
            {/* Group header */}
            <div className={cn("flex items-center justify-between px-4 py-3")}>
              <div className="flex items-center gap-2">
                <span className={cn("text-sm font-semibold", GROUP_COLORS[mg])}>
                  {MUSCLE_GROUP_LABELS[mg]}
                </span>
                <span className={cn("text-xs opacity-60", GROUP_COLORS[mg])}>
                  {trackedCount}/{groupExercises.length} tracked
                </span>
              </div>
              {onTrack && (
                <button
                  onClick={() => onTrack(mg)}
                  className="rounded-lg bg-emerald-500 hover:bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white transition-colors"
                >
                  Track
                </button>
              )}
            </div>

            {/* Exercise rows */}
            <div className="bg-white dark:bg-zinc-950 divide-y divide-zinc-100 dark:divide-zinc-800">
              {groupExercises.map((ex) => {
                const sets = workoutData[ex.id] ?? [];
                const isCardio = ex.muscleGroup === "CARDIO";
                const hasData = sets.some((s) => Number(s.reps) > 0);

                return (
                  <div key={ex.id} className="flex items-center gap-3 px-4 py-3">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                        hasData
                          ? "bg-amber-100 dark:bg-amber-900/40"
                          : "bg-zinc-100 dark:bg-zinc-800"
                      )}
                    >
                      <ExerciseIcon name={ex.name} muscleGroup={ex.muscleGroup} className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "text-sm font-medium",
                          hasData
                            ? "text-zinc-900 dark:text-white"
                            : "text-zinc-400 dark:text-zinc-600"
                        )}
                      >
                        {ex.name.charAt(0) + ex.name.slice(1).toLowerCase()}
                      </p>
                      <p
                        className={cn(
                          "text-xs mt-0.5",
                          hasData
                            ? "text-zinc-500 dark:text-zinc-400"
                            : "text-zinc-300 dark:text-zinc-700"
                        )}
                      >
                        {formatSets(sets, ex.isBodyweight, isCardio)}
                      </p>
                    </div>
                    {hasData && (
                      <span className="w-5 h-5 rounded-full bg-amber-500 ring-2 ring-amber-300 flex items-center justify-center shrink-0">
                        <span className="text-white font-black leading-none drop-shadow-sm" style={{ fontSize: "9px" }}>✓</span>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
