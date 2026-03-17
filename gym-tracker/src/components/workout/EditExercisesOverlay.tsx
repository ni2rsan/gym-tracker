"use client";

import { useState, useEffect, useTransition } from "react";
import { X, ChevronUp, ChevronDown, Eye, EyeOff, Plus, Minus, RotateCcw, Trash2 } from "lucide-react";
import {
  hideExercise,
  unhideExercise,
  setPreferredSets,
  reorderExercises,
  getHiddenExercises,
  getExercises,
} from "@/actions/exercise";
import { MUSCLE_GROUP_ORDER, MUSCLE_GROUP_LABELS } from "@/constants/exercises";
import type { ExerciseWithSettings, MuscleGroup } from "@/types";
import { AddCustomExercise } from "./AddCustomExercise";
import { DeleteExerciseModal } from "./DeleteExerciseModal";

interface HiddenExercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  isOwnedAndDeletable: boolean;
}

interface EditExercisesOverlayProps {
  allExercises: ExerciseWithSettings[];
  onClose: (changed: boolean) => void;
}

const MIN_SETS = 1;
const MAX_SETS = 6;

export function EditExercisesOverlay({ allExercises, onClose }: EditExercisesOverlayProps) {
  const [localExercises, setLocalExercises] = useState(allExercises);
  // hiddenIds: set of exercise IDs currently hidden (shown dimmed in list)
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  // hiddenExercises: hidden exercises with their metadata (initially loaded from server)
  const [hiddenExercises, setHiddenExercises] = useState<HiddenExercise[]>([]);
  const [changed, setChanged] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const refreshExercises = () => {
    Promise.all([getExercises(), getHiddenExercises()]).then(([exResult, hiddenResult]) => {
      const visible = (exResult.success && exResult.data ? exResult.data : []) as ExerciseWithSettings[];
      const hidden = (hiddenResult.success && hiddenResult.data ? hiddenResult.data : []) as HiddenExercise[];
      setHiddenExercises(hidden);
      setHiddenIds(new Set(hidden.map(h => h.id)));
      const visibleIds = new Set(visible.map(e => e.id));
      const hiddenAsEx = hidden
        .filter(h => !visibleIds.has(h.id))
        .map(h => ({
          id: h.id,
          name: h.name,
          muscleGroup: h.muscleGroup,
          isDefault: false,
          isBodyweight: false,
          isCompound: false,
          sortOrder: 999,
          isPinned: false,
          userSortOrder: 999,
          preferredSets: null,
          createdByUserId: null,
          isOwnedAndDeletable: h.isOwnedAndDeletable,
        } as ExerciseWithSettings));
      setLocalExercises([...visible, ...hiddenAsEx]);
    });
  };

  useEffect(() => {
    refreshExercises();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const exercisesByGroup = MUSCLE_GROUP_ORDER.reduce((acc, mg) => {
    acc[mg] = localExercises.filter((e) => e.muscleGroup === mg);
    return acc;
  }, {} as Record<MuscleGroup, ExerciseWithSettings[]>);

  const handleMove = (mg: MuscleGroup, idx: number, direction: -1 | 1) => {
    // Only reorder visible (non-hidden) exercises
    const groupVisible = exercisesByGroup[mg].filter(e => !hiddenIds.has(e.id));
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= groupVisible.length) return;
    [groupVisible[idx], groupVisible[newIdx]] = [groupVisible[newIdx], groupVisible[idx]];
    // Rebuild full list maintaining hidden exercises at their positions
    const groupHidden = exercisesByGroup[mg].filter(e => hiddenIds.has(e.id));
    const newGroup = [...groupVisible, ...groupHidden];
    const newList = MUSCLE_GROUP_ORDER.flatMap((g) => (g === mg ? newGroup : exercisesByGroup[g]));
    setLocalExercises(newList);
    setChanged(true);
    startTransition(async () => {
      await reorderExercises(newList.filter(e => !hiddenIds.has(e.id)).map((e) => e.id));
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

  const handleToggleHide = (ex: ExerciseWithSettings) => {
    const isCurrentlyHidden = hiddenIds.has(ex.id);
    if (isCurrentlyHidden) {
      // Restore
      setHiddenIds(prev => { const next = new Set(prev); next.delete(ex.id); return next; });
      setChanged(true);
      startTransition(async () => { await unhideExercise(ex.id); });
    } else {
      // Hide
      setHiddenIds(prev => new Set(prev).add(ex.id));
      setChanged(true);
      startTransition(async () => { await hideExercise(ex.id); });
    }
  };

  const handleDeleted = (exerciseId: string) => {
    setLocalExercises(prev => prev.filter(e => e.id !== exerciseId));
    setHiddenIds(prev => { const next = new Set(prev); next.delete(exerciseId); return next; });
    setChanged(true);
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
          const visibleExercises = groupExercises.filter(e => !hiddenIds.has(e.id));
          const hiddenGroupExercises = groupExercises.filter(e => hiddenIds.has(e.id));
          return (
            <div key={mg}>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2">
                {MUSCLE_GROUP_LABELS[mg]}
              </p>
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800">
                {/* Visible exercises */}
                {visibleExercises.map((ex, idx) => {
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
                          disabled={idx === visibleExercises.length - 1 || isPending}
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

                      {/* Eye: remove from layout */}
                      <button
                        onClick={() => handleToggleHide(ex)}
                        disabled={isPending}
                        className="w-7 h-7 flex items-center justify-center rounded text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 disabled:opacity-30 transition-colors shrink-0"
                        title="Remove from layout"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      {/* Trash: only for owned+deletable */}
                      {ex.isOwnedAndDeletable && (
                        <button
                          onClick={() => setDeleteTarget({ id: ex.id, name: ex.name })}
                          disabled={isPending}
                          className="w-7 h-7 flex items-center justify-center rounded text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-30 transition-colors shrink-0"
                          title="Delete exercise"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  );
                })}

                {/* Hidden exercises (dimmed, with restore eye icon) */}
                {hiddenGroupExercises.map((ex) => (
                  <div key={ex.id} className="flex items-center gap-2 px-3 py-2.5 opacity-40">
                    {/* Spacer for reorder buttons */}
                    <div className="w-5 shrink-0" />

                    {/* Name */}
                    <span className="flex-1 text-sm text-zinc-500 dark:text-zinc-400 truncate line-through">
                      {ex.name.charAt(0) + ex.name.slice(1).toLowerCase()}
                    </span>

                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 shrink-0">hidden</span>

                    {/* Eye-off: restore to layout */}
                    <button
                      onClick={() => handleToggleHide(ex)}
                      disabled={isPending}
                      className="w-7 h-7 flex items-center justify-center rounded text-zinc-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 disabled:opacity-30 transition-colors shrink-0 opacity-100"
                      title="Restore to layout"
                    >
                      <EyeOff className="h-4 w-4" />
                    </button>

                    {/* Trash: only for owned+deletable */}
                    {ex.isOwnedAndDeletable && (
                      <button
                        onClick={() => setDeleteTarget({ id: ex.id, name: ex.name })}
                        disabled={isPending}
                        className="w-7 h-7 flex items-center justify-center rounded text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-30 transition-colors shrink-0 opacity-100"
                        title="Delete exercise"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

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
          refreshExercises();
        }}
      />

      <DeleteExerciseModal
        open={deleteTarget !== null}
        exercise={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onRemoved={handleDeleted}
      />
    </div>
  );
}
