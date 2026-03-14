"use client";

import { useState, useTransition } from "react";
import { Check, Pencil, X, Dumbbell, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { adminUpdateExercise, adminDeleteExercise } from "@/actions/exercise";

interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
  isCompound: boolean;
  isDefault: boolean;
}

interface ExerciseEditorProps {
  exercises: Exercise[];
}

const GROUP_LABELS: Record<string, string> = {
  UPPER_BODY: "Upper Body",
  LOWER_BODY: "Lower Body",
  BODYWEIGHT: "Bodyweight",
  CARDIO: "Cardio",
};

const GROUP_ORDER = ["UPPER_BODY", "LOWER_BODY", "BODYWEIGHT", "CARDIO"];

export function ExerciseEditor({ exercises }: ExerciseEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [localExercises, setLocalExercises] = useState(exercises);
  const [isPending, startTransition] = useTransition();

  const grouped = GROUP_ORDER.map((group) => ({
    group,
    items: localExercises.filter((e) => e.muscleGroup === group),
  }));

  function startEdit(ex: Exercise) {
    setEditingId(ex.id);
    setEditName(ex.name);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setError(null);
  }

  function saveName(id: string) {
    const trimmed = editName.trim();
    if (!trimmed) { setError("Name cannot be empty."); return; }
    startTransition(async () => {
      const result = await adminUpdateExercise(id, { name: trimmed });
      if (result.success) {
        setLocalExercises((prev) =>
          prev.map((e) => (e.id === id ? { ...e, name: trimmed } : e))
        );
        setEditingId(null);
        setEditName("");
      } else {
        setError(result.error ?? "Failed to save.");
      }
    });
  }

  function toggleCompound(id: string, current: boolean) {
    startTransition(async () => {
      await adminUpdateExercise(id, { isCompound: !current });
      setLocalExercises((prev) =>
        prev.map((e) => (e.id === id ? { ...e, isCompound: !current } : e))
      );
    });
  }

  function confirmDelete(id: string) {
    setConfirmDeleteId(id);
  }

  function cancelDelete() {
    setConfirmDeleteId(null);
  }

  function doDelete(id: string) {
    startTransition(async () => {
      const result = await adminDeleteExercise(id);
      if (result.success) {
        setLocalExercises((prev) => prev.filter((e) => e.id !== id));
        setConfirmDeleteId(null);
      } else {
        setError(result.error ?? "Failed to delete.");
        setConfirmDeleteId(null);
      }
    });
  }

  return (
    <div className="space-y-6">
      {grouped.map(({ group, items }) => (
        <div key={group} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900">
          <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
            <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{GROUP_LABELS[group]}</h2>
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {items.map((ex) => {
              const isEditing = editingId === ex.id;
              return (
                <div key={ex.id} className="flex items-center gap-3 px-4 py-3">
                  <Dumbbell className="h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500" />

                  {isEditing ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        autoFocus
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveName(ex.id);
                          if (e.key === "Escape") cancelEdit();
                        }}
                        className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1 text-sm text-zinc-900 dark:text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <button
                        onClick={() => saveName(ex.id)}
                        disabled={isPending}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-colors disabled:opacity-50"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center gap-2 min-w-0">
                      <span className="text-sm font-medium text-zinc-900 dark:text-white truncate">{ex.name}</span>
                      {ex.isCompound && (
                        <span className="shrink-0 inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/30 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                          Compound
                        </span>
                      )}
                    </div>
                  )}

                  {!isEditing && (
                    <div className="flex items-center gap-2 shrink-0">
                      {confirmDeleteId === ex.id ? (
                        <>
                          <span className="text-xs text-red-600 dark:text-red-400 font-medium">Delete?</span>
                          <button
                            onClick={() => doDelete(ex.id)}
                            disabled={isPending}
                            className="text-[10px] font-semibold rounded-md px-2 py-0.5 bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-50"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={cancelDelete}
                            className="text-[10px] font-semibold rounded-md px-2 py-0.5 border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          {/* Compound toggle */}
                          <button
                            onClick={() => toggleCompound(ex.id, ex.isCompound)}
                            disabled={isPending}
                            title={ex.isCompound ? "Mark as isolation" : "Mark as compound"}
                            className={cn(
                              "text-[10px] font-medium rounded-full px-2 py-0.5 border transition-colors disabled:opacity-50",
                              ex.isCompound
                                ? "border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                                : "border-zinc-200 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            )}
                          >
                            {ex.isCompound ? "Compound ✓" : "Isolation"}
                          </button>
                          {/* Edit name */}
                          <button
                            onClick={() => startEdit(ex)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors"
                            aria-label="Edit name"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          {/* Delete */}
                          <button
                            onClick={() => confirmDelete(ex.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-colors"
                            aria-label="Delete exercise"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {error && (
        <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
