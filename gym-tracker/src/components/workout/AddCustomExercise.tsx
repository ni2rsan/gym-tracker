"use client";

import { useState, useEffect, useTransition } from "react";
import { RotateCcw } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createExercise, getHiddenExercises, unhideExercise, getCommunityExercises, adoptExercise } from "@/actions/exercise";
import { MuscleGroup, MUSCLE_GROUP_LABELS } from "@/constants/exercises";

interface HiddenExercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
}

interface AddCustomExerciseProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  defaultMuscleGroup?: MuscleGroup;
}

export function AddCustomExercise({ open, onClose, onCreated, defaultMuscleGroup }: AddCustomExerciseProps) {
  const [name, setName] = useState("");
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup>(defaultMuscleGroup ?? MuscleGroup.UPPER_BODY);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [hiddenExercises, setHiddenExercises] = useState<HiddenExercise[]>([]);
  const [communityExercises, setCommunityExercises] = useState<HiddenExercise[]>([]);

  useEffect(() => {
    if (open) {
      setMuscleGroup(defaultMuscleGroup ?? MuscleGroup.UPPER_BODY);
      setName("");
      setError("");
      // Load hidden + community exercises
      Promise.all([getHiddenExercises(), getCommunityExercises()]).then(([hidden, community]) => {
        if (hidden.success && hidden.data) setHiddenExercises(hidden.data as HiddenExercise[]);
        if (community.success && community.data) setCommunityExercises(community.data as HiddenExercise[]);
      });
    }
  }, [open, defaultMuscleGroup]);

  // Filter to the currently selected muscle group
  const suggestedHidden = hiddenExercises.filter((e) => e.muscleGroup === muscleGroup);
  const suggestedCommunity = communityExercises.filter((e) => e.muscleGroup === muscleGroup);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Exercise name is required.");
      return;
    }
    setError("");
    startTransition(async () => {
      const result = await createExercise({ name, muscleGroup, isBodyweight: muscleGroup === MuscleGroup.BODYWEIGHT || muscleGroup === MuscleGroup.CARDIO });
      if (result.success) {
        setName("");
        setMuscleGroup(MuscleGroup.UPPER_BODY);
        onCreated();
        onClose();
      } else {
        setError(result.error ?? "Failed to create exercise.");
      }
    });
  };

  const handleRestore = (exerciseId: string) => {
    startTransition(async () => {
      const result = await unhideExercise(exerciseId);
      if (result.success) {
        setHiddenExercises((prev) => prev.filter((e) => e.id !== exerciseId));
        onCreated();
      }
    });
  };

  const handleAdopt = (exerciseId: string) => {
    startTransition(async () => {
      const result = await adoptExercise(exerciseId);
      if (result.success) {
        setCommunityExercises((prev) => prev.filter((e) => e.id !== exerciseId));
        onCreated();
      }
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Exercise">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Muscle group selector */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Muscle group
          </label>
          <select
            value={muscleGroup}
            onChange={(e) => setMuscleGroup(e.target.value as MuscleGroup)}
            className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
          >
            {(Object.values(MuscleGroup) as MuscleGroup[]).map((mg) => (
              <option key={String(mg)} value={String(mg)}>
                {MUSCLE_GROUP_LABELS[mg]}
              </option>
            ))}
          </select>
        </div>

        {/* Previously removed exercises */}
        {suggestedHidden.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Previously removed — add back</p>
            <div className="flex flex-col gap-1">
              {suggestedHidden.map((ex) => (
                <div
                  key={ex.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2"
                >
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    {ex.name.charAt(0) + ex.name.slice(1).toLowerCase()}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRestore(ex.id)}
                    disabled={isPending}
                    className="flex items-center gap-1 rounded-md bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 px-2 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors disabled:opacity-50"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Restore
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Community exercises */}
        {suggestedCommunity.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Exercises added by other users</p>
            <div className="flex flex-col gap-1">
              {suggestedCommunity.map((ex) => (
                <div
                  key={ex.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2"
                >
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    {ex.name.charAt(0) + ex.name.slice(1).toLowerCase()}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAdopt(ex.id)}
                    disabled={isPending}
                    className="rounded-md bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 px-2 py-1 text-[11px] font-semibold text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors disabled:opacity-50"
                  >
                    + Add
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Divider */}
        {(suggestedHidden.length > 0 || suggestedCommunity.length > 0) && (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
            <span className="text-[10px] text-zinc-400 uppercase tracking-wide">or create new</span>
            <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
          </div>
        )}

        {/* Custom name input */}
        <Input
          label="Custom exercise name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. CABLE CRUNCH"
          error={error}
          autoFocus={suggestedHidden.length === 0}
        />

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" loading={isPending} className="flex-1">
            Add Exercise
          </Button>
        </div>
      </form>
    </Modal>
  );
}
