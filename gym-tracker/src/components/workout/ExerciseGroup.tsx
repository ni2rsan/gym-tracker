"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
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
}

export function ExerciseGroup({
  muscleGroup,
  exercises,
  workoutData,
  onSetsChange,
  onTogglePin,
  onRemove,
  defaultOpen = true,
}: ExerciseGroupProps) {
  const [open, setOpen] = useState(defaultOpen);

  if (exercises.length === 0) return null;

  const GROUP_COLORS: Record<MuscleGroup, string> = {
    UPPER_BODY: "text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/50",
    LOWER_BODY: "text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/50",
    BODYWEIGHT: "text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/50",
  };

  const GROUP_BG: Record<MuscleGroup, string> = {
    UPPER_BODY: "bg-blue-50 dark:bg-blue-950/20",
    LOWER_BODY: "bg-amber-50 dark:bg-amber-950/20",
    BODYWEIGHT: "bg-purple-50 dark:bg-purple-950/20",
  };

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
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
          <span>{MUSCLE_GROUP_LABELS[muscleGroup]}</span>
          <span className={cn("text-xs font-normal opacity-60")}>
            {exercises.length} exercise{exercises.length !== 1 ? "s" : ""}
          </span>
        </span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {/* Exercise cards */}
      {open && (
        <div className={cn(
          "p-3 grid gap-3",
          muscleGroup === "BODYWEIGHT"
            ? "grid-cols-2"
            : "grid-cols-1 lg:grid-cols-3"
        )}>
          {exercises.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              sets={workoutData[exercise.id] ?? []}
              onSetsChange={(sets) => onSetsChange(exercise.id, sets)}
              onTogglePin={onTogglePin}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
}
