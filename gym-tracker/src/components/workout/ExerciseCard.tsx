"use client";

import { useState, useTransition } from "react";
import { Pin, PinOff, Trash2, Plus, Minus, EyeOff, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { SetRow } from "./SetRow";
import { ExerciseIcon } from "./ExerciseIcon";
import { setPreferredSets } from "@/actions/exercise";
import type { ExerciseWithSettings, SetData } from "@/types";

interface ExerciseCardProps {
  exercise: ExerciseWithSettings;
  sets: SetData[];
  onSetsChange: (sets: SetData[]) => void;
  onTogglePin: (id: string) => void;
  onRemove: (id: string) => void;
  isReadOnly?: boolean;
  isTracked?: boolean;
  onDeleteTracking?: () => void;
  isSkipped?: boolean;
  onSkipChange?: (id: string, skipped: boolean) => void;
}

export function ExerciseCard({
  exercise,
  sets,
  onSetsChange,
  onTogglePin,
  onRemove,
  isReadOnly = false,
  isTracked = false,
  onDeleteTracking,
  isSkipped = false,
  onSkipChange,
}: ExerciseCardProps) {
  const isCardio = exercise.muscleGroup === "CARDIO";
  const [, startTransition] = useTransition();
  const [isEditMode, setIsEditMode] = useState(false);

  // Locked when explicitly read-only OR tracked but not in edit mode
  const locked = isReadOnly || (isTracked && !isEditMode);

  const updateSet = (index: number, updated: SetData) => {
    const newSets = sets.map((s, i) => (i === index ? updated : s));
    onSetsChange(newSets);
  };

  const cardHeader = (
    <div className="flex items-center gap-2 mb-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
        <ExerciseIcon name={exercise.name} muscleGroup={exercise.muscleGroup} />
      </div>
      <h3 className="flex-1 min-w-0 font-semibold text-sm text-zinc-900 dark:text-white break-words leading-tight">
        {exercise.name}
        {exercise.isPinned && (
          <span className="ml-1.5 text-emerald-500 text-xs" aria-label="Pinned">★</span>
        )}
      </h3>
      {isTracked && (
        <span className="w-5 h-5 rounded-full bg-amber-500 ring-2 ring-amber-300 flex items-center justify-center shrink-0">
          <span className="text-white font-black leading-none" style={{ fontSize: "9px" }}>✓</span>
        </span>
      )}
      <button
        onClick={() => onTogglePin(exercise.id)}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors"
        aria-label={exercise.isPinned ? "Unpin exercise" : "Pin exercise"}
      >
        {exercise.isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
      </button>
      <button
        onClick={() => onRemove(exercise.id)}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-colors"
        aria-label="Remove exercise"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );

  const trackedBar = isTracked && (
    <div className="flex items-center justify-end gap-1.5 mb-3 -mt-1">
      {isEditMode ? (
        <button
          onClick={() => setIsEditMode(false)}
          className="rounded-md border border-zinc-200 dark:border-zinc-700 px-2 py-1 text-[11px] text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
        >
          Cancel
        </button>
      ) : (
        <>
          <button
            onClick={() => setIsEditMode(true)}
            className="rounded-md border border-zinc-200 dark:border-zinc-700 px-2 py-1 text-[11px] text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            Edit
          </button>
          <button
            onClick={onDeleteTracking}
            className="rounded-md border border-red-200 dark:border-red-800 px-2 py-1 text-[11px] text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          >
            Untrack
          </button>
        </>
      )}
    </div>
  );

  if (isSkipped) {
    return (
      <div className="rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-4 flex items-center gap-2 opacity-50">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
          <ExerciseIcon name={exercise.name} muscleGroup={exercise.muscleGroup} />
        </div>
        <span className="flex-1 text-sm text-zinc-400 dark:text-zinc-500">{exercise.name}</span>
        <button
          onClick={() => onSkipChange?.(exercise.id, false)}
          className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
        >
          <Eye className="h-3 w-3" /> Un-skip
        </button>
      </div>
    );
  }

  if (isCardio) {
    const minutes = sets[0]?.reps;
    return (
      <div className={cn(
        "rounded-xl border bg-white p-4 transition-shadow hover:shadow-sm dark:bg-zinc-900",
        exercise.isPinned
          ? "border-emerald-200 dark:border-emerald-800/50"
          : "border-zinc-200 dark:border-zinc-800"
      )}>
        {cardHeader}
        {trackedBar}
        <div className={cn("flex items-center justify-center gap-2", locked && "opacity-50")}>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={999}
            value={!minutes || minutes === 0 ? "" : minutes}
            placeholder="0"
            disabled={locked}
            onChange={(e) => {
              const mins = e.target.value === "" ? 0 : parseInt(e.target.value, 10) || 0;
              onSetsChange([{ setNumber: 1, reps: mins, weightKg: "" }]);
            }}
            className={cn(
              "h-9 w-16 rounded-lg border border-zinc-200 bg-zinc-50 px-2 text-center text-sm text-zinc-900 placeholder-zinc-300 focus:border-rose-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-rose-500 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-white dark:placeholder-zinc-600 dark:focus:border-rose-400 dark:focus:bg-zinc-800 dark:focus:ring-rose-400 transition-colors",
              locked && "cursor-not-allowed"
            )}
          />
          <span className="text-xs text-zinc-400 dark:text-zinc-500">min</span>
        </div>
        {!locked && (
          <div className="flex justify-end mt-2">
            <button
              onClick={() => onSkipChange?.(exercise.id, true)}
              className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
            >
              <EyeOff className="h-3 w-3" />
              Skip today
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn(
      "rounded-xl border bg-white p-4 transition-shadow hover:shadow-sm dark:bg-zinc-900",
      exercise.isPinned
        ? "border-emerald-200 dark:border-emerald-800/50"
        : "border-zinc-200 dark:border-zinc-800"
    )}>
      {cardHeader}
      {trackedBar}

      {/* Column headers */}
      <div className="flex items-center gap-1.5 mb-1.5 text-xs text-zinc-400 dark:text-zinc-500">
        <span className="w-10 shrink-0 text-center">Set</span>
        <span className="flex-1 text-center">Reps</span>
        {!exercise.isBodyweight && <span className="flex-1 text-center">kg</span>}
      </div>

      {/* Sets */}
      <div className={cn("flex flex-col gap-2", locked && "opacity-50 pointer-events-none")}>
        {sets.map((set, index) => (
          <SetRow
            key={set.setNumber}
            setNumber={set.setNumber}
            data={set}
            isBodyweight={exercise.isBodyweight}
            onChange={(updated) => updateSet(index, updated)}
          />
        ))}
      </div>

      {/* Add / Remove set + Skip */}
      {!locked && (
        <div className="flex items-center gap-1.5 mt-2">
          <button
            onClick={() => {
              const next = sets.length <= 1 ? sets : sets.slice(0, -1);
              onSetsChange(next);
              startTransition(async () => { await setPreferredSets(exercise.id, next.length); });
            }}
            disabled={sets.length <= 1}
            className="flex items-center gap-0.5 rounded-md border border-zinc-200 dark:border-zinc-700 px-2 py-1 text-[11px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Minus className="h-2.5 w-2.5" /> Set
          </button>
          <button
            onClick={() => {
              const next = [...sets, { setNumber: sets.length + 1, reps: 0, weightKg: "" }];
              onSetsChange(next);
              startTransition(async () => { await setPreferredSets(exercise.id, next.length); });
            }}
            className="flex items-center gap-0.5 rounded-md border border-zinc-200 dark:border-zinc-700 px-2 py-1 text-[11px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <Plus className="h-2.5 w-2.5" /> Set
          </button>
          <button
            onClick={() => onSkipChange?.(exercise.id, true)}
            className="ml-auto flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
          >
            <EyeOff className="h-3 w-3" />
            Skip today
          </button>
        </div>
      )}
    </div>
  );
}
