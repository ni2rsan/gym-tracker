"use client";

import { useState, useTransition, useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";
import { ExerciseGroup } from "./ExerciseGroup";
import { AddCustomExercise } from "./AddCustomExercise";
import { DeleteExerciseModal } from "./DeleteExerciseModal";
import { saveWorkout, getWorkoutForDate, getLastKnownSets } from "@/actions/workout";
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
  initialDate?: string;
}

type ToastState = { message: string; type: "success" | "error" } | null;

export function WorkoutForm({ initialExercises, initialDate }: WorkoutFormProps) {
  const [exercises, setExercises] = useState(initialExercises);
  const [workoutDate, setWorkoutDate] = useState(initialDate ?? todayISODate());
  const [workoutData, setWorkoutData] = useState<Record<string, SetData[]>>({});
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const searchParams = useSearchParams();
  const didScrollRef = useRef(false);
  const [savingGroups, setSavingGroups] = useState<Set<MuscleGroup>>(new Set());
  const [lastSavedByGroup, setLastSavedByGroup] = useState<Partial<Record<MuscleGroup, Date>>>({});
  const [lastSavedAll, setLastSavedAll] = useState<Date | null>(null);

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
      const [dateResult, lastResult] = await Promise.all([
        getWorkoutForDate(workoutDate),
        getLastKnownSets(),
      ]);
      const existing = dateResult.success && dateResult.data ? dateResult.data : {};
      const lastKnown = lastResult.success && lastResult.data ? lastResult.data : {};
      // For each exercise with no data for this date, fall back to last known sets
      const merged: typeof existing = { ...lastKnown, ...existing };
      setWorkoutData(initializeSets(exercises, merged));
      setIsLoading(false);
    })();
  }, [workoutDate, exercises, initializeSets]);

  // Scroll to section when navigated from planner "Track workout →"
  useEffect(() => {
    if (isLoading || didScrollRef.current) return;
    const section = searchParams.get("section");
    if (!section) return;
    const el = document.getElementById(`section-${section}`);
    if (el) {
      didScrollRef.current = true;
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [isLoading, searchParams]);

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
        setLastSavedAll(new Date());
        setToast({ message: "Workout saved ✓", type: "success" });
      } else {
        setToast({ message: result.error ?? "Failed to save", type: "error" });
      }
    });
  };

  const handleSaveGroup = (mg: MuscleGroup) => {
    setSavingGroups((prev) => new Set(prev).add(mg));
    startTransition(async () => {
      const groupExercises = exercises.filter((ex) => ex.muscleGroup === mg);
      const exerciseInputs = groupExercises.map((ex) => ({
        exerciseId: ex.id,
        sets: workoutData[ex.id] ?? [],
      }));
      const result = await saveWorkout({ date: workoutDate, exercises: exerciseInputs });
      if (result.success) {
        setLastSavedByGroup((prev) => ({ ...prev, [mg]: new Date() }));
        setToast({ message: `${MUSCLE_GROUP_ORDER.includes(mg) ? mg.replace("_", " ") : mg} saved ✓`, type: "success" });
      } else {
        setToast({ message: result.error ?? "Failed to save", type: "error" });
      }
      setSavingGroups((prev) => {
        const next = new Set(prev);
        next.delete(mg);
        return next;
      });
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

  const filledCount = exercises.filter((ex) =>
    (workoutData[ex.id] ?? []).some((s) => Number(s.reps) > 0)
  ).length;

  const lastSavedTime = lastSavedAll ?? (
    Object.values(lastSavedByGroup).reduce<Date | null>(
      (latest, d) => (!latest || (d && d > latest) ? d ?? null : latest),
      null
    )
  );

  function formatLastSaved(d: Date | null): string {
    if (!d) return "Not saved yet";
    const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
    if (diffMin < 1) return "Saved just now";
    return `Saved ${diffMin}m ago`;
  }

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <input
          type="date"
          value={workoutDate}
          onChange={(e) => e.target.value && setWorkoutDate(e.target.value)}
          className="h-8 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
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
            Save All
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
            <div key={mg} id={`section-${mg}`}>
              <ExerciseGroup
                muscleGroup={mg}
                exercises={exercisesByGroup[mg]}
                workoutData={workoutData}
                onSetsChange={handleSetsChange}
                onTogglePin={handleTogglePin}
                onRemove={handleRemoveClick}
                defaultOpen={true}
                onSave={exercisesByGroup[mg].length > 0 ? () => handleSaveGroup(mg) : undefined}
                isSaving={savingGroups.has(mg)}
                lastSaved={lastSavedByGroup[mg] ?? null}
              />
            </div>
          ))}

          {/* Bottom bar */}
          <div className="flex items-center gap-3 pt-1 border-t border-zinc-200 dark:border-zinc-800">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
            >
              ↑ Top
            </button>
            <div className="flex-1 text-center text-xs text-zinc-400 dark:text-zinc-500 truncate">
              {filledCount}/{exercises.length} exercises · {formatLastSaved(lastSavedTime)}
            </div>
            <Button size="sm" onClick={handleSave} loading={isPending} disabled={isLoading}>
              <Save className="h-3.5 w-3.5" />
              Save All
            </Button>
          </div>
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
