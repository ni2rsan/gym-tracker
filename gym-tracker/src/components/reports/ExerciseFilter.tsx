"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";
import { MUSCLE_GROUP_LABELS } from "@/constants/exercises";
import type { ExerciseWithSettings, MuscleGroup } from "@/types";

const CATEGORIES: { value: MuscleGroup; label: string }[] = [
  { value: "UPPER_BODY", label: MUSCLE_GROUP_LABELS.UPPER_BODY },
  { value: "LOWER_BODY", label: MUSCLE_GROUP_LABELS.LOWER_BODY },
  { value: "BODYWEIGHT", label: MUSCLE_GROUP_LABELS.BODYWEIGHT },
  { value: "CARDIO", label: MUSCLE_GROUP_LABELS.CARDIO },
];

const CATEGORY_ACTIVE: Record<MuscleGroup, string> = {
  UPPER_BODY: "bg-blue-600 text-white border-blue-600",
  LOWER_BODY: "bg-amber-500 text-white border-amber-500",
  BODYWEIGHT: "bg-purple-600 text-white border-purple-600",
  CARDIO: "bg-rose-600 text-white border-rose-600",
};

interface ExerciseFilterProps {
  exercises: ExerciseWithSettings[];
  selectedCategory: MuscleGroup;
  selectedExerciseIds: string[]; // refinement — empty means "show all in category"
}

export function ExerciseFilter({
  exercises,
  selectedCategory,
  selectedExerciseIds,
}: ExerciseFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const push = (cat: MuscleGroup, exIds: string[]) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("cat", cat);
    if (exIds.length > 0) {
      params.set("exIds", exIds.join(","));
    } else {
      params.delete("exIds");
    }
    startTransition(() => router.push(`/reports?${params.toString()}`, { scroll: false }));
  };

  const switchCategory = (cat: MuscleGroup) => {
    // Switching category resets refinement
    push(cat, []);
  };

  const toggleExercise = (id: string) => {
    const next = selectedExerciseIds.includes(id)
      ? selectedExerciseIds.filter((e) => e !== id)
      : [...selectedExerciseIds, id];
    push(selectedCategory, next);
  };

  const categoryExercises = exercises.filter((e) => e.muscleGroup === selectedCategory);

  return (
    <div className="space-y-2.5">
      {/* Row 1: Category radio */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(({ value, label }) => {
          const active = selectedCategory === value;
          return (
            <button
              key={value}
              onClick={() => switchCategory(value)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors border",
                active
                  ? CATEGORY_ACTIVE[value]
                  : "border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Row 2: Exercise refinement chips */}
      {categoryExercises.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {categoryExercises.map((ex) => {
            // If nothing is selected → all are "active" (show all mode)
            // If some are selected → only those are active
            const isRefined = selectedExerciseIds.length > 0;
            const active = isRefined
              ? selectedExerciseIds.includes(ex.id)
              : false;

            return (
              <button
                key={ex.id}
                onClick={() => toggleExercise(ex.id)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors border",
                  active
                    ? "bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900 dark:border-white"
                    : isRefined
                    ? "border-zinc-200 text-zinc-400 hover:border-zinc-300 hover:text-zinc-600 dark:border-zinc-700 dark:text-zinc-500 dark:hover:border-zinc-600 dark:hover:text-zinc-300"
                    : "border-zinc-200 text-zinc-600 hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:bg-zinc-800"
                )}
              >
                {ex.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
