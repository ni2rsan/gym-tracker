"use client";

import { Pin, PinOff, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SetRow } from "./SetRow";
import { ExerciseIcon } from "./ExerciseIcon";
import type { ExerciseWithSettings, SetData } from "@/types";

interface ExerciseCardProps {
  exercise: ExerciseWithSettings;
  sets: SetData[];
  onSetsChange: (sets: SetData[]) => void;
  onTogglePin: (id: string) => void;
  onRemove: (id: string) => void;
}

export function ExerciseCard({
  exercise,
  sets,
  onSetsChange,
  onTogglePin,
  onRemove,
}: ExerciseCardProps) {
  const updateSet = (index: number, updated: SetData) => {
    const newSets = sets.map((s, i) => (i === index ? updated : s));
    onSetsChange(newSets);
  };

  return (
    <div className={cn(
      "rounded-xl border bg-white p-4 transition-shadow hover:shadow-sm dark:bg-zinc-900",
      exercise.isPinned
        ? "border-emerald-200 dark:border-emerald-800/50"
        : "border-zinc-200 dark:border-zinc-800"
    )}>
      {/* Header: icon + name + pin + trash */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
          <ExerciseIcon name={exercise.name} muscleGroup={exercise.muscleGroup} />
        </div>
        <h3 className="flex-1 min-w-0 font-semibold text-sm text-zinc-900 dark:text-white break-words">
          {exercise.name}
          {exercise.isPinned && (
            <span className="ml-1.5 text-emerald-500 text-xs" aria-label="Pinned">★</span>
          )}
        </h3>
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

      {/* Column headers — aligned to match SetRow layout */}
      <div className="flex items-center gap-1.5 mb-1.5 text-xs text-zinc-400 dark:text-zinc-500">
        <span className="w-10 shrink-0 text-center">Set</span>
        <span className="flex-1 text-center">Reps</span>
        {!exercise.isBodyweight && <span className="flex-1 text-center">kg</span>}
      </div>

      {/* Sets */}
      <div className="flex flex-col gap-2">
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
    </div>
  );
}
