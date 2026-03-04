"use client";

import { useState, useTransition, useCallback, useEffect } from "react";
import { Plus, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";
import { ExerciseGroup } from "./ExerciseGroup";
import { AddCustomExercise } from "./AddCustomExercise";
import { DeleteExerciseModal } from "./DeleteExerciseModal";
import { saveWorkout, getWorkoutForDate } from "@/actions/workout";
import { togglePin } from "@/actions/exercise";
import { MUSCLE_GROUP_ORDER } from "@/constants/exercises";
import { todayISODate } from "@/lib/utils";
import type { ExerciseWithSettings, SetData, MuscleGroup } from "@/types";

const DEFAULT_SETS = 3;
const BODYWEIGHT_SETS = 1;

function makeEmptySets(count: number): SetData[] {
  return Array.from({ length: count }, (_, i) => ({
    setNumber: i + 1,
    reps: 0,
    weightKg: "",
  }));
}

interface WorkoutFormProps {
  initialExercises: ExerciseWithSettings[];
}

type ToastState = { message: string; type: "success" | "error" } | null;

export function WorkoutForm({ initialExercises }: WorkoutFormProps) {
  const [exercises, setExercises] = useState(initialExercises);
  const [workoutDate] = useState(todayISODate());
  const [workoutData, setWorkoutData] = useState<Record<string, SetData[]>>({});
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);

  const initializeSets = useCallback(
    (exList: ExerciseWithSettings[], existing: Record<string, Array<{ setNumber: number; reps: number; weightKg: number | null }>>) => {
      const data: Record<string, SetData[]> = {};
      for (const ex of exList) {
        const targetSets = ex.isBodyweight ? BODYWEIGHT_SETS : DEFAULT_SETS;
        const savedSets = existing[ex.id];
        if (savedSets && savedSets.length > 0) {
          data[ex.id] = savedSets.slice(0, targetSets).map((s) => ({
            setNumber: s.setNumber,
            reps: s.reps,
            weightKg: s.weightKg ?? "",
          }));
          while (data[ex.id].length < targetSets) {
            data[ex.id].push({ setNumber: data[ex.id].length + 1, reps: 0, weightKg: "" });
          }
        } else {
          data[ex.id] = makeEmptySets(targetSets);
        }
      }
      return data;
    },
    []
  );

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      const result = await getWorkoutForDate(workoutDate);
      const existing = result.success && result.data ? result.data : {};
      setWorkoutData(initializeSets(exercises, existing));
      setIsLoading(false);
    })();
  }, [workoutDate, exercises, initializeSets]);

  const handleSetsChange = (exerciseId: string, sets: SetData[]) => {
    setWorkoutData((prev) => ({ ...prev, [exerciseId]: sets }));
  };

  const handleTogglePin = (exerciseId: string) => {
    startTransition(async () => {
      await togglePin(exerciseId);
      setExercises((prev) =>
        prev.map((e) => (e.id === exerciseId ? { ...e, isPinned: !e.isPinned } : e))
      );
    });
  };

  const handleRemoveClick = (exerciseId: string) => {
    const ex = exercises.find((e) => e.id === exerciseId);
    if (ex) setRemoveTarget({ id: ex.id, name: ex.name });
  };

  const handleExerciseRemoved = (exerciseId: string) => {
    setExercises((prev) => prev.filter((e) => e.id !== exerciseId));
    setWorkoutData((prev) => {
      const next = { ...prev };
      delete next[exerciseId];
      return next;
    });
  };

  const handleSave = () => {
    startTransition(async () => {
      const exerciseInputs = exercises.map((ex) => ({
        exerciseId: ex.id,
        sets: workoutData[ex.id] ?? [],
      }));

      const result = await saveWorkout({ date: workoutDate, exercises: exerciseInputs });
      if (result.success) {
        setToast({ message: "Workout saved ✓", type: "success" });
      } else {
        setToast({ message: result.error ?? "Failed to save", type: "error" });
      }
    });
  };

  const sortedExercises = [...exercises].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    const groupOrder =
      MUSCLE_GROUP_ORDER.indexOf(a.muscleGroup) - MUSCLE_GROUP_ORDER.indexOf(b.muscleGroup);
    if (groupOrder !== 0) return groupOrder;
    return (a.userSortOrder || a.sortOrder) - (b.userSortOrder || b.sortOrder);
  });

  const exercisesByGroup = MUSCLE_GROUP_ORDER.reduce(
    (acc, mg) => {
      acc[mg] = sortedExercises.filter((e) => e.muscleGroup === mg);
      return acc;
    },
    {} as Record<MuscleGroup, ExerciseWithSettings[]>
  );

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex items-center justify-between">
        <div>
          <p suppressHydrationWarning className="text-sm text-zinc-500 dark:text-zinc-400">
            Today — {new Date(workoutDate + "T12:00:00").toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowAddExercise(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Exercise
          </Button>
          <Button size="sm" onClick={handleSave} loading={isPending} disabled={isLoading}>
            <Save className="h-3.5 w-3.5" />
            Save Workout
          </Button>
        </div>
      </div>

      {/* Exercise groups */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-zinc-200 dark:border-zinc-800 h-16 animate-pulse bg-zinc-100 dark:bg-zinc-800" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {MUSCLE_GROUP_ORDER.map((mg) => (
            <ExerciseGroup
              key={mg}
              muscleGroup={mg}
              exercises={exercisesByGroup[mg]}
              workoutData={workoutData}
              onSetsChange={handleSetsChange}
              onTogglePin={handleTogglePin}
              onRemove={handleRemoveClick}
              defaultOpen={true}
            />
          ))}
        </div>
      )}

      {/* Add custom exercise modal */}
      <AddCustomExercise
        open={showAddExercise}
        onClose={() => setShowAddExercise(false)}
        onCreated={() => window.location.reload()}
      />

      {/* Delete/hide exercise modal */}
      <DeleteExerciseModal
        open={removeTarget !== null}
        exercise={removeTarget}
        onClose={() => setRemoveTarget(null)}
        onRemoved={handleExerciseRemoved}
      />

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
