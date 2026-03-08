"use client";

import { useState, useTransition } from "react";
import { X, ArrowLeft, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { ExerciseIcon } from "./ExerciseIcon";
import { SetRow } from "./SetRow";
import { saveWorkout } from "@/actions/workout";
import { MUSCLE_GROUP_LABELS } from "@/constants/exercises";
import type { ExerciseWithSettings, SetData, MuscleGroup } from "@/types";

type TrackingView =
  | { kind: "icons" }
  | { kind: "exercise"; exercise: ExerciseWithSettings };

interface TrackingModeProps {
  exercises: ExerciseWithSettings[];
  date: string;
  initialCompletedIds: Set<string>;
  scopeLabel: string;
  workoutData?: Record<string, SetData[]>;
  onExit: () => void;
  onBack: () => void;
  onExerciseSaved: (exerciseId: string, sets: SetData[]) => void;
}

const GROUP_COLORS: Record<MuscleGroup, string> = {
  UPPER_BODY: "text-blue-600 dark:text-blue-400",
  LOWER_BODY: "text-amber-600 dark:text-amber-400",
  BODYWEIGHT: "text-purple-600 dark:text-purple-400",
  CARDIO: "text-rose-600 dark:text-rose-400",
};

function makeEmptySets(ex: ExerciseWithSettings): SetData[] {
  const count = ex.isBodyweight || ex.muscleGroup === "CARDIO" ? 1 : 3;
  return Array.from({ length: count }, (_, i) => ({
    setNumber: i + 1,
    reps: 0,
    weightKg: "",
  }));
}

export function TrackingMode({
  exercises,
  date,
  initialCompletedIds,
  scopeLabel,
  workoutData,
  onExit,
  onBack,
  onExerciseSaved,
}: TrackingModeProps) {
  const [view, setView] = useState<TrackingView>({ kind: "icons" });
  const [completedIds, setCompletedIds] = useState<Set<string>>(initialCompletedIds);
  const [sets, setSets] = useState<SetData[]>([]);
  const [sessionSavedSets, setSessionSavedSets] = useState<Record<string, SetData[]>>({});
  const [isPending, startTransition] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleOpenExercise = (ex: ExerciseWithSettings) => {
    // Pre-fill: session saves take priority, then today's workoutData, then empty
    const prefill =
      sessionSavedSets[ex.id] ??
      workoutData?.[ex.id] ??
      makeEmptySets(ex);
    setSets(prefill.map((s) => ({ ...s })));
    setSaveError(null);
    setView({ kind: "exercise", exercise: ex });
  };

  const handleSave = (ex: ExerciseWithSettings) => {
    startTransition(async () => {
      const result = await saveWorkout({ date, exercises: [{ exerciseId: ex.id, sets }] });
      if (result.success) {
        setCompletedIds((prev) => new Set(prev).add(ex.id));
        setSessionSavedSets((prev) => ({ ...prev, [ex.id]: sets }));
        onExerciseSaved(ex.id, sets);
        setView({ kind: "icons" });
      } else {
        setSaveError(result.error ?? "Failed to save");
      }
    });
  };

  // ── Icons view ────────────────────────────────────────────────────────────
  if (view.kind === "icons") {
    const allDone = exercises.length > 0 && exercises.every((ex) => completedIds.has(ex.id));

    return (
      <div className="fixed inset-0 z-[60] bg-white dark:bg-zinc-950 overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="text-center">
            <p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wide font-medium">Tracking Mode</p>
            <p className="text-sm font-semibold text-zinc-900 dark:text-white">{scopeLabel}</p>
          </div>
          <button
            onClick={onExit}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="h-4 w-4" />
            Exit
          </button>
        </div>

        {/* All done banner */}
        {allDone && (
          <div className="mx-4 mt-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-4 py-3 text-center">
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">All exercises tracked!</p>
            <button
              onClick={onExit}
              className="mt-1 text-xs text-emerald-600 dark:text-emerald-500 underline underline-offset-2"
            >
              Exit tracking mode
            </button>
          </div>
        )}

        {/* Icon grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-x-4 gap-y-6 p-5">
          {exercises.map((ex) => {
            const done = completedIds.has(ex.id);
            return (
              <button
                key={ex.id}
                onClick={() => handleOpenExercise(ex)}
                className="flex flex-col items-center gap-2 text-center active:scale-95 transition-transform"
              >
                {/* Round app icon */}
                <div
                  className={cn(
                    "relative w-16 h-16 rounded-full flex items-center justify-center transition-colors",
                    done
                      ? "bg-amber-100 dark:bg-amber-900/50 ring-2 ring-amber-400 dark:ring-amber-500"
                      : "bg-zinc-100 dark:bg-zinc-800 ring-2 ring-zinc-200 dark:ring-zinc-700 active:ring-zinc-300 dark:active:ring-zinc-600"
                  )}
                >
                  <ExerciseIcon name={ex.name} muscleGroup={ex.muscleGroup} className="h-7 w-7 sm:h-8 sm:w-8" />
                  {done && (
                    <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-950 flex items-center justify-center">
                      <span className="text-white font-bold leading-none" style={{ fontSize: "9px" }}>✓</span>
                    </span>
                  )}
                </div>
                <span
                  className={cn(
                    "text-[11px] font-medium leading-tight line-clamp-2 w-full",
                    done ? "text-amber-700 dark:text-amber-400" : "text-zinc-600 dark:text-zinc-400"
                  )}
                >
                  {ex.name.charAt(0) + ex.name.slice(1).toLowerCase()}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Exercise detail view ──────────────────────────────────────────────────
  const ex = view.exercise;
  const isCardio = ex.muscleGroup === "CARDIO";

  return (
    <div className="fixed inset-0 z-[60] bg-white dark:bg-zinc-950 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <button
          onClick={() => setView({ kind: "icons" })}
          className="flex items-center justify-center w-8 h-8 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wide font-medium">
            {MUSCLE_GROUP_LABELS[ex.muscleGroup]}
          </p>
          <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
            {ex.name.charAt(0) + ex.name.slice(1).toLowerCase()}
          </p>
        </div>
        <button
          onClick={onExit}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center gap-6">
        {/* Large icon */}
        <div className="flex flex-col items-center gap-2">
          <div
            className={cn(
              "w-24 h-24 rounded-full flex items-center justify-center",
              "bg-zinc-100 dark:bg-zinc-800 ring-2 ring-zinc-200 dark:ring-zinc-700"
            )}
          >
            <ExerciseIcon name={ex.name} muscleGroup={ex.muscleGroup} className="h-12 w-12" />
          </div>
          <span className={cn("text-xs font-semibold uppercase tracking-wide", GROUP_COLORS[ex.muscleGroup])}>
            {MUSCLE_GROUP_LABELS[ex.muscleGroup]}
          </span>
        </div>

        {/* Set inputs */}
        <div className="w-full max-w-sm space-y-2">
          {sets.length > 0 && (
            <div className="flex items-center gap-1.5 px-1 mb-1">
              <span className="w-10 shrink-0" />
              <span className="flex-1 text-center text-xs font-medium text-zinc-400 dark:text-zinc-500">
                {isCardio ? "Minutes" : "Reps"}
              </span>
              {!ex.isBodyweight && !isCardio && (
                <span className="flex-1 text-center text-xs font-medium text-zinc-400 dark:text-zinc-500">Weight (kg)</span>
              )}
            </div>
          )}
          {sets.map((set, i) => (
            <SetRow
              key={set.setNumber}
              setNumber={set.setNumber}
              data={set}
              isBodyweight={ex.isBodyweight || isCardio}
              onChange={(updated) => setSets((prev) => prev.map((s, idx) => (idx === i ? updated : s)))}
            />
          ))}
        </div>

        {saveError && <p className="text-xs text-red-500">{saveError}</p>}
      </div>

      {/* Footer */}
      <div
        className="px-4 pt-4 border-t border-zinc-200 dark:border-zinc-800 flex gap-3"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <button
          onClick={() => setView({ kind: "icons" })}
          className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 py-3 text-sm font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => handleSave(ex)}
          disabled={isPending}
          className="flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 py-3 text-sm font-bold text-white transition-colors flex items-center justify-center gap-2"
        >
          <Save className="h-4 w-4" />
          Save
        </button>
      </div>
    </div>
  );
}
