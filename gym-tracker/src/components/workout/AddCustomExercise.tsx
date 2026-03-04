"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createExercise } from "@/actions/exercise";
import { MuscleGroup, MUSCLE_GROUP_LABELS } from "@/constants/exercises";

interface AddCustomExerciseProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function AddCustomExercise({ open, onClose, onCreated }: AddCustomExerciseProps) {
  const [name, setName] = useState("");
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup>(MuscleGroup.UPPER_BODY);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

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

  return (
    <Modal open={open} onClose={onClose} title="Add Custom Exercise">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Exercise name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. CABLE CRUNCH"
          error={error}
          autoFocus
        />

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
