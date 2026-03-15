"use client";

import { useState, useEffect, useTransition } from "react";
import { X, ChevronUp, ChevronDown, EyeOff, Plus, Minus, RotateCcw } from "lucide-react";
import {
  hideExercise,
  unhideExercise,
  setPreferredSets,
  reorderExercises,
  getHiddenExercises,
} from "@/actions/exercise";
import { MUSCLE_GROUP_ORDER, MUSCLE_GROUP_LABELS } from "@/constants/exercises";
import type { ExerciseWithSettings, MuscleGroup } from "@/types";
import { AddCustomExercise } from "./AddCustomExercise";

interface HiddenExercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
}

interface EditExercisesOverlayProps {
  allExercises: ExerciseWithSettings[];
  onClose: (changed: boolean) => void;
}

const MIN_SETS = 1;
const MAX_SETS = 6;

export function EditExercisesOverlay({ allExercises, onClose }: EditExercisesOverlayProps) {
  const [localExercises, setLocalExercises] = useState(allExercises);
  const [hiddenExercises, setHiddenExercises] = useState<HiddenExercise[]>([]);
  const [changed, setChanged] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getHiddenExercises().then((result) => {
      if (result.success && result.data) {
        setHiddenExercises(
          result.data.map((ex) => ({
            id: ex.id,
            name: ex.name,
            muscleGroup: ex.muscleGroup as MuscleGroup,
          }))
        );
      }
    });
  }, []);

  const exercisesByGroup = MUSCLE_GROUP_ORDER.reduce((acc, mg) => {
    acc[mg] = localExercises.filter((e) => e.muscleGroup === mg);
    return acc;
  }, {} as Record<MuscleGroup, ExerciseWithSettings[]>);

  const handleMove = (mg: MuscleGroup, idx: number, direction: -1 | 1) => {
    const group = [...exercisesByGroup[mg]];
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= group.length) return;
    [group[idx], group[newIdx]] = [group[newIdx], group[idx]];
    const newList = MUSCLE_GROUP_ORDER.flatMap((g) => (g === mg ? group : exercisesByGroup[g]));
    setLocalExercises(newList);
    setChanged(true);
    startTransition(async () => {
      await reorderExercises(newList.map((e) => e.id));
    });
  };

  const handleSetCount = (ex: ExerciseWithSettings, delta: number) => {
    const current = ex.preferredSets ?? (ex.isBodyweight ? 1 : 3);
    const next = Math.max(MIN_SETS, Math.min(MAX_SETS, current + delta));
    if (next === current) return;
    setLocalExercises((prev) =>
      prev.map((e) => (e.id === ex.id ? { ...e, preferredSets: next } : e))
    );
    setChanged(true);
    startTransition(async () => {
      await setPreferredSets(ex.id, next);
    });
  };

  const handleHide = (ex: ExerciseWithSettings) => {
    setLocalExercises((prev) => prev.filter((e) => e.id !== ex.id));
    setHiddenExercises((prev) => [
      ...prev,
      { id: ex.id, name: ex.name, muscleGroup: ex.muscleGroup },
    ]);
    setChanged(true);
    startTransition(async () => {
      await hideExercise(ex.id);
    });
  };

  const handleRestore = (ex: HiddenExercise) => {
    setHiddenExercises((prev) => prev.filter((e) => e.id !== ex.id));
    setChanged(true);
    startTransition(async () => {
      await unhideExercise(ex.id);
    });
  };

  return (
    <div className="fixed inset-0 z-[70] bg-white dark:bg-zinc-950 overflow-y-auto flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Edit Exercises</h2>
        <button
          onClick={() => onClose(changed)}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <X className="h-4 w-4" />
          Done
        </button>
      </div>

      <div className="flex-1 p-4 space-y-6 pb-8">
        {/* Grouped exercises */}
        {MUSCLE_GROUP_ORDER.map((mg) => {
          const groupExercises = exercisesByGroup[mg];
          if (groupExercises.length === 0) return null;
          return (
            <div key={mg}>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2">
                {MUSCLE_GROUP_LABELS[mg]}
              </p>
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800">
                {groupExercises.map((ex, idx) => {
                  const setCount = ex.preferredSets ?? (ex.isBodyweight ? 1 : 3);
                  return (
                    <div key={ex.id} className="flex items-center gap-2 px-3 py-2.5">
                      {/* Reorder */}
                      <div className="flex flex-col gap-0.5 shrink-0">
                        <button
                          onClick={() => handleMove(mg, idx, -1)}
                          disabled={idx === 0 || isPending}
                          className="w-5 h-5 flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 disabled:opacity-20 transition-colors"
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleMove(mg, idx, 1)}
                          disabled={idx === groupExercises.length - 1 || isPending}
                          className="w-5 h-5 flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 disabled:opacity-20 transition-colors"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Name */}
                      <span className="flex-1 text-sm text-zinc-900 dark:text-white truncate">
                        {ex.name.charAt(0) + ex.name.slice(1).toLowerCase()}
                      </span>

                      {/* Set count */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleSetCount(ex, -1)}
                          disabled={setCount <= MIN_SETS || isPending}
                          className="w-6 h-6 flex items-center justify-center rounded border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-30 transition-colors"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 w-6 text-center">
                          {setCount}s
                        </span>
                        <button
                          onClick={() => handleSetCount(ex, 1)}
                          disabled={setCount >= MAX_SETS || isPending}
                          className="w-6 h-6 flex items-center justify-center rounded border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-30 transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Hide */}
                      <button
                        onClick={() => handleHide(ex)}
                        disabled={isPending}
                        className="w-7 h-7 flex items-center justify-center rounded text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-30 transition-colors shrink-0"
                        title="Remove from layout"
                      >
                        <EyeOff className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Hidden exercises */}
        {hiddenExercises.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2">
              Hidden
            </p>
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800">
              {hiddenExercises.map((ex) => (
                <div key={ex.id} className="flex items-center gap-2 px-3 py-2.5">
                  <span className="flex-1 text-sm text-zinc-500 dark:text-zinc-400 truncate">
                    {ex.name.charAt(0) + ex.name.slice(1).toLowerCase()}
                  </span>
                  <span className="text-xs text-zinc-400 dark:text-zinc-500 shrink-0">
                    {MUSCLE_GROUP_LABELS[ex.muscleGroup]}
                  </span>
                  <button
                    onClick={() => handleRestore(ex)}
                    disabled={isPending}
                    className="flex items-center gap-1 rounded-lg border border-emerald-200 dark:border-emerald-800 px-2 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 disabled:opacity-40 transition-colors shrink-0"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Add back
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add new exercise */}
        <button
          onClick={() => setAddOpen(true)}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 py-3 text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add New Exercise
        </button>
      </div>

      <AddCustomExercise
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={() => {
          setAddOpen(false);
          setChanged(true);
        }}
      />
    </div>
  );
}
