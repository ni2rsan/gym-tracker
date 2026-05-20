"use client";

import { useTransition } from "react";
import { Trash2, Archive } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { hideExercise, deleteExerciseData } from "@/actions/exercise";

interface DeleteExerciseModalProps {
  open: boolean;
  exercise: { id: string; name: string } | null;
  onClose: () => void;
  onRemoved: (exerciseId: string) => void;
}

export function DeleteExerciseModal({
  open,
  exercise,
  onClose,
  onRemoved,
}: DeleteExerciseModalProps) {
  const [isPending, startTransition] = useTransition();

  if (!exercise) return null;

  const handleKeep = () => {
    startTransition(async () => {
      await hideExercise(exercise.id);
      onRemoved(exercise.id);
      onClose();
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      await deleteExerciseData(exercise.id);
      onRemoved(exercise.id);
      onClose();
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={`Remove ${exercise.name}`}>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
        This exercise has saved workout data. How would you like to remove it?
      </p>

      <div className="flex flex-col gap-3">
        {/* Keep data */}
        <button
          onClick={handleKeep}
          disabled={isPending}
          className="flex items-start gap-4 rounded-xl border border-zinc-200 p-4 text-left transition-colors hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
            <Archive className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-white">Keep data</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Remove from the workout page. Historical data stays in Reports and Logs.
            </p>
          </div>
        </button>

        {/* Delete all */}
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="flex items-start gap-4 rounded-xl border border-red-200 p-4 text-left transition-colors hover:border-red-300 hover:bg-red-50 disabled:opacity-50 dark:border-red-900/50 dark:hover:border-red-800 dark:hover:bg-red-950/20"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
            <Trash2 className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">
              Delete all associated data
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Permanently removes this exercise and every set ever logged for it. Cannot be undone.
            </p>
          </div>
        </button>
      </div>
    </Modal>
  );
}
