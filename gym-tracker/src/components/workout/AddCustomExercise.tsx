"use client";

import { useState, useEffect, useTransition } from "react";
import { RotateCcw, ChevronDown, ChevronUp, Search } from "lucide-react";
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
  const [search, setSearch] = useState("");
  const [communityExpanded, setCommunityExpanded] = useState(false);

  useEffect(() => {
    if (open) {
      setMuscleGroup(defaultMuscleGroup ?? MuscleGroup.UPPER_BODY);
      setName("");
      setError("");
      setSearch("");
      setCommunityExpanded(false);
      Promise.all([getHiddenExercises(), getCommunityExercises()]).then(([hidden, community]) => {
        if (hidden.success && hidden.data) setHiddenExercises(hidden.data as HiddenExercise[]);
        if (community.success && community.data) setCommunityExercises(community.data as HiddenExercise[]);
      });
    }
  }, [open, defaultMuscleGroup]);

  const searchLower = search.trim().toLowerCase();

  // Filter hidden and community by search query (search across ALL groups)
  const filteredHidden = hiddenExercises.filter((e) =>
    !searchLower || e.name.toLowerCase().includes(searchLower)
  );
  const filteredCommunity = communityExercises.filter((e) =>
    !searchLower || e.name.toLowerCase().includes(searchLower)
  );

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
        {/* Global search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search exercises..."
            className="w-full h-9 rounded-lg border border-zinc-200 bg-zinc-50 pl-8 pr-3 text-sm text-zinc-900 placeholder-zinc-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-white dark:placeholder-zinc-500 dark:focus:border-emerald-400 dark:focus:bg-zinc-800"
          />
        </div>

        {/* Removed from layout */}
        {filteredHidden.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Removed from layout</p>
            <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
              {filteredHidden.map((ex) => (
                <div
                  key={ex.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm text-zinc-700 dark:text-zinc-300 truncate">
                      {ex.name.charAt(0) + ex.name.slice(1).toLowerCase()}
                    </span>
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 shrink-0">
                      {MUSCLE_GROUP_LABELS[ex.muscleGroup]}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRestore(ex.id)}
                    disabled={isPending}
                    className="flex items-center gap-1 rounded-md bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 px-2 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors disabled:opacity-50 shrink-0 ml-2"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Restore
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Added by other users (collapsible) */}
        {(filteredCommunity.length > 0 || (communityExercises.length > 0 && searchLower.length > 0)) && (
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => setCommunityExpanded((e) => !e)}
              className="flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
            >
              <span>Added by other users {filteredCommunity.length > 0 ? `(${filteredCommunity.length})` : ""}</span>
              {communityExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            {communityExpanded && filteredCommunity.length > 0 && (
              <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                {filteredCommunity.map((ex) => (
                  <div
                    key={ex.id}
                    className="flex items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm text-zinc-700 dark:text-zinc-300 truncate">
                        {ex.name.charAt(0) + ex.name.slice(1).toLowerCase()}
                      </span>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 shrink-0">
                        {MUSCLE_GROUP_LABELS[ex.muscleGroup]}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAdopt(ex.id)}
                      disabled={isPending}
                      className="rounded-md bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 px-2 py-1 text-[11px] font-semibold text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors disabled:opacity-50 shrink-0 ml-2"
                    >
                      + Add
                    </button>
                  </div>
                ))}
              </div>
            )}
            {communityExpanded && filteredCommunity.length === 0 && searchLower.length > 0 && (
              <p className="text-xs text-zinc-400 dark:text-zinc-500 italic">No matches found.</p>
            )}
          </div>
        )}

        {/* Divider */}
        {(filteredHidden.length > 0 || communityExercises.length > 0) && (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
            <span className="text-[10px] text-zinc-400 uppercase tracking-wide">or create new</span>
            <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
          </div>
        )}

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

        {/* Custom name input */}
        <Input
          label="Exercise name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. CABLE CRUNCH"
          error={error}
          autoFocus={filteredHidden.length === 0}
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
