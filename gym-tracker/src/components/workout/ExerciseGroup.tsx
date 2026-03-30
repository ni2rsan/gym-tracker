"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronUp, Save, Plus, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { ExerciseCard } from "./ExerciseCard";
import { MUSCLE_GROUP_LABELS } from "@/constants/exercises";
import type { ExerciseWithSettings, SetData, MuscleGroup } from "@/types";

interface ExerciseGroupProps {
  muscleGroup: MuscleGroup;
  exercises: ExerciseWithSettings[];
  workoutData: Record<string, SetData[]>;
  onSetsChange: (exerciseId: string, sets: SetData[]) => void;
  onTogglePin: (exerciseId: string) => void;
  onRemove: (exerciseId: string) => void;
  defaultOpen?: boolean;
  onSave?: () => void;
  isSaving?: boolean;
  lastSaved?: Date | null;
  onTrack?: () => void;
  onAdd?: () => void;
  readOnlyIds?: Set<string>;
  trackedIds?: Set<string>;
  onDeleteTracking?: (exerciseId: string) => void;
  skippedIds?: Set<string>;
  onSkipChange?: (id: string, skipped: boolean) => void;
  onHide?: (exerciseId: string) => void;
  removedFromLayout?: ExerciseWithSettings[];
  onRestoreFromLayout?: (exerciseId: string) => void;
  /** When true, removes outer border/rounding (for use inside a parent container) */
  isNested?: boolean;
  /** Exercise IDs that were individually planned for the selected date */
  plannedExerciseIds?: Set<string>;
  /** Override the group label (e.g. "Added Exercises") */
  groupLabel?: string;
  /** Per-exercise outcome data for diff display after save */
  outcomeData?: Record<string, {
    outcome: "positive" | "negative" | "pr" | null;
    diffData?: Record<number, { diffReps: number | null; diffKg: number | null; isPRSet: boolean }>;
  }>;
  onSaveExercise?: (exerciseId: string) => void;
  /** Timestamp per exercise — when it changes the card remounts, resetting edit mode */
  savedAtByExercise?: Record<string, Date>;
}

export function ExerciseGroup({
  muscleGroup,
  exercises,
  workoutData,
  onSetsChange,
  onTogglePin,
  onRemove,
  defaultOpen = true,
  onSave,
  isSaving,
  lastSaved,
  onTrack,
  onAdd,
  readOnlyIds,
  trackedIds,
  onDeleteTracking,
  skippedIds,
  onSkipChange,
  onHide,
  removedFromLayout = [],
  onRestoreFromLayout,
  isNested = false,
  plannedExerciseIds,
  groupLabel,
  outcomeData,
  onSaveExercise,
  savedAtByExercise,
}: ExerciseGroupProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [removedOpen, setRemovedOpen] = useState(false);

  // When async planner data loads and defaultOpen changes true→false, collapse the group.
  // Don't auto-open if user has manually closed it.
  const prevDefault = useRef(defaultOpen);
  useEffect(() => {
    if (!defaultOpen && prevDefault.current) {
      setOpen(false);
    }
    prevDefault.current = defaultOpen;
  }, [defaultOpen]);

  if (exercises.length === 0 && !onAdd && removedFromLayout.length === 0) return null;

  const GROUP_COLORS: Record<MuscleGroup, string> = {
    UPPER_BODY: "text-blue-500 dark:text-blue-400 border-blue-200 dark:border-blue-800/50",
    LOWER_BODY: "text-green-600 dark:text-green-400 border-green-200 dark:border-green-800/50",
    BODYWEIGHT: "text-purple-500 dark:text-purple-400 border-purple-200 dark:border-purple-800/50",
    CARDIO: "text-rose-500 dark:text-rose-400 border-rose-200 dark:border-rose-800/50",
  };

  const GROUP_BG: Record<MuscleGroup, string> = {
    UPPER_BODY: "bg-blue-50 dark:bg-blue-950/20",
    LOWER_BODY: "bg-green-50 dark:bg-green-950/20",
    BODYWEIGHT: "bg-purple-50 dark:bg-purple-950/20",
    CARDIO: "bg-rose-50 dark:bg-rose-950/20",
  };

  return (
    <div className={cn(
      "overflow-hidden",
      isNested ? "" : "rounded-xl border border-zinc-200 dark:border-zinc-800"
    )}>
      {/* Section header */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full flex items-center justify-between px-5 py-3.5 font-semibold text-sm transition-colors",
          GROUP_BG[muscleGroup],
          GROUP_COLORS[muscleGroup]
        )}
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <span>{groupLabel ?? MUSCLE_GROUP_LABELS[muscleGroup]}</span>
          <span className={cn("text-xs font-normal opacity-60")}>
            {exercises.length} exercise{exercises.length !== 1 ? "s" : ""}
          </span>
        </span>
        <span className="flex items-center gap-1.5">
          {onAdd && (
            <span
              role="button"
              onClick={(e) => { e.stopPropagation(); onAdd(); }}
              className="rounded-lg border border-current px-2 py-1 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 opacity-70 hover:opacity-100"
            >
              <Plus className="h-3 w-3" />
              Add
            </span>
          )}
          {onTrack && (
            <span
              role="button"
              onClick={(e) => { e.stopPropagation(); onTrack(); }}
              className="rounded-lg bg-emerald-500 hover:bg-emerald-600 px-2 py-1 text-xs font-semibold text-white transition-colors cursor-pointer"
            >
              Track Mode
            </span>
          )}
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      {/* Top save button */}
      {open && onSave && (
        <div className="px-3 pt-3 flex items-center justify-end">
          <button
            onClick={onSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
          >
            <Save className="h-3 w-3" />
            Save {groupLabel ?? MUSCLE_GROUP_LABELS[muscleGroup]}
          </button>
        </div>
      )}

      {/* Exercise cards */}
      {open && (
        <div>
          {exercises.length === 0 ? (
            <div className="px-5 py-4 text-xs text-zinc-400 dark:text-zinc-600 italic">
              No exercises yet — tap Add to get started.
            </div>
          ) : (
            <div className={cn(
              "p-3 grid gap-3",
              muscleGroup === "BODYWEIGHT" || muscleGroup === "CARDIO"
                ? "grid-cols-1 sm:grid-cols-2"
                : "grid-cols-1 lg:grid-cols-3"
            )}>
              {exercises.map((exercise) => (
                <ExerciseCard
                  key={`${exercise.id}-${savedAtByExercise?.[exercise.id]?.getTime() ?? 0}`}
                  exercise={exercise}
                  sets={workoutData[exercise.id] ?? []}
                  onSetsChange={(sets) => onSetsChange(exercise.id, sets)}
                  onTogglePin={onTogglePin}
                  onRemove={onRemove}
                  onHide={onHide}
                  isReadOnly={readOnlyIds?.has(exercise.id)}
                  isTracked={trackedIds?.has(exercise.id)}
                  onDeleteTracking={() => onDeleteTracking?.(exercise.id)}
                  isSkipped={skippedIds?.has(exercise.id)}
                  onSkipChange={onSkipChange}
                  isPlanned={plannedExerciseIds?.has(exercise.id)}
                  outcome={outcomeData?.[exercise.id]?.outcome}
                  diffData={outcomeData?.[exercise.id]?.diffData}
                  onSave={onSaveExercise ? () => onSaveExercise(exercise.id) : undefined}
                />
              ))}
            </div>
          )}
          {onSave && (
            <div className="px-3 pb-3 flex items-center justify-between gap-3">
              {lastSaved && (
                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                  Saved {Math.max(0, Math.floor((Date.now() - lastSaved.getTime()) / 60000)) === 0
                    ? "just now"
                    : `${Math.floor((Date.now() - lastSaved.getTime()) / 60000)}m ago`}
                </span>
              )}
              <button
                onClick={onSave}
                disabled={isSaving}
                className="ml-auto flex items-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
              >
                <Save className="h-3 w-3" />
                Save {groupLabel ?? MUSCLE_GROUP_LABELS[muscleGroup]}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Removed from layout collapsed section */}
      {removedFromLayout.length > 0 && (
        <div className="border-t border-zinc-100 dark:border-zinc-800">
          <button
            onClick={() => setRemovedOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2 text-xs text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
          >
            <span>Removed from layout ({removedFromLayout.length})</span>
            {removedOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          {removedOpen && (
            <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
              {removedFromLayout.map((ex) => (
                <div key={ex.id} className="flex items-center gap-2 px-4 py-2 opacity-50">
                  <span className="flex-1 text-xs text-zinc-500 dark:text-zinc-400 truncate line-through">
                    {ex.name.charAt(0) + ex.name.slice(1).toLowerCase()}
                  </span>
                  <button
                    onClick={() => onRestoreFromLayout?.(ex.id)}
                    className="flex items-center gap-1 rounded-md border border-zinc-200 dark:border-zinc-700 px-2 py-1 text-[11px] text-zinc-500 dark:text-zinc-400 hover:text-emerald-600 hover:border-emerald-300 dark:hover:text-emerald-400 dark:hover:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors opacity-100 shrink-0"
                    title="Restore to layout"
                  >
                    <Eye className="h-3 w-3" />
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
