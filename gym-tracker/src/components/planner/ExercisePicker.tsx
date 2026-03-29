"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Search, X, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getExercises } from "@/actions/exercise";
import { addPlannedExercise, removePlannedExercise } from "@/actions/planner";
import type { PlannedExerciseInfo } from "@/actions/planner";
import { ExerciseIcon } from "@/components/workout/ExerciseIcon";
import type { MuscleGroup } from "@/types";

const GROUP_ORDER = ["UPPER_BODY", "LOWER_BODY", "BODYWEIGHT", "CARDIO"] as const;
const GROUP_LABELS: Record<string, string> = {
  UPPER_BODY: "Upper Body",
  LOWER_BODY: "Lower Body",
  BODYWEIGHT: "Bodyweight",
  CARDIO: "Cardio",
};

interface ExercisePickerProps {
  date: string;
  /** Already-planned exercises for this date */
  plannedExercises: PlannedExerciseInfo[];
  /** Muscle groups already covered by planned workout blocks (these exercises are disabled) */
  blockedMuscleGroups?: Set<string>;
  onClose: () => void;
  onPlannedChanged: (updated: PlannedExerciseInfo[]) => void;
}

export function ExercisePicker({ date, plannedExercises, blockedMuscleGroups = new Set(), onClose, onPlannedChanged }: ExercisePickerProps) {
  const [query, setQuery] = useState("");
  const [exercises, setExercises] = useState<{ id: string; name: string; muscleGroup: string; isBodyweight: boolean }[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(true);
  const [planned, setPlanned] = useState<PlannedExerciseInfo[]>(plannedExercises);
  const [pending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getExercises().then((result) => {
      if (result.success && result.data) {
        setExercises(result.data.map((e) => ({
          id: e.id,
          name: e.name,
          muscleGroup: e.muscleGroup,
          isBodyweight: e.isBodyweight,
        })));
      }
      setLoadingExercises(false);
    });
    setTimeout(() => searchRef.current?.focus(), 100);
  }, []);

  const plannedIds = new Set(planned.map((p) => p.exerciseId));

  const filtered = exercises.filter((e) =>
    e.name.toLowerCase().includes(query.toLowerCase()) &&
    !blockedMuscleGroups.has(e.muscleGroup)
  );

  const grouped = GROUP_ORDER.reduce<Record<string, typeof filtered>>((acc, g) => {
    acc[g] = filtered.filter((e) => e.muscleGroup === g);
    return acc;
  }, {} as Record<string, typeof filtered>);

  const handleToggle = (ex: { id: string; name: string; muscleGroup: string; isBodyweight: boolean }) => {
    if (pendingId) return;
    if (plannedIds.has(ex.id)) {
      // Remove
      const entry = planned.find((p) => p.exerciseId === ex.id);
      if (!entry) return;
      setPendingId(ex.id);
      startTransition(async () => {
        const result = await removePlannedExercise(entry.id);
        if (result.success) {
          const next = planned.filter((p) => p.exerciseId !== ex.id);
          setPlanned(next);
          onPlannedChanged(next);
        }
        setPendingId(null);
      });
    } else {
      // Add
      setPendingId(ex.id);
      startTransition(async () => {
        const result = await addPlannedExercise(date, ex.id);
        if (result.success && result.data) {
          const next = [...planned, result.data];
          setPlanned(next);
          onPlannedChanged(next);
        }
        setPendingId(null);
      });
    }
  };

  const dateLabel = (() => {
    const d = new Date(date + "T12:00:00");
    return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  })();

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Sheet */}
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-white">Add exercises</p>
            <p suppressHydrationWarning className="text-xs text-zinc-400 dark:text-zinc-500">{dateLabel}</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl px-3 py-2">
            <Search className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search exercises…"
              className="flex-1 bg-transparent text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 outline-none"
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-zinc-400">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Planned summary */}
        {planned.length > 0 && (
          <div className="px-4 py-2 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
            <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1.5">
              Planned ({planned.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {planned.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleToggle({ id: p.exerciseId, name: p.exerciseName, muscleGroup: p.muscleGroup, isBodyweight: p.isBodyweight })}
                  disabled={pendingId === p.exerciseId}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-1 text-xs font-medium disabled:opacity-50"
                >
                  {pendingId === p.exerciseId ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <X className="h-3 w-3" />
                  )}
                  {p.exerciseName.toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Exercise list */}
        <div className="overflow-y-auto flex-1">
          {loadingExercises ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
            </div>
          ) : (
            GROUP_ORDER.map((group) => {
              const groupExs = grouped[group];
              if (!groupExs || groupExs.length === 0) return null;
              return (
                <div key={group}>
                  <p className="px-4 py-2 text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide bg-zinc-50 dark:bg-zinc-800/50 sticky top-0">
                    {GROUP_LABELS[group]}
                  </p>
                  <div className="divide-y divide-zinc-50 dark:divide-zinc-800">
                    {groupExs.map((ex) => {
                      const isPlanned = plannedIds.has(ex.id);
                      const isThisPending = pendingId === ex.id;
                      return (
                        <button
                          key={ex.id}
                          onClick={() => handleToggle(ex)}
                          disabled={isThisPending || (!!pendingId && !isThisPending)}
                          className={cn(
                            "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors disabled:opacity-60",
                            isPlanned
                              ? "bg-emerald-50 dark:bg-emerald-900/10"
                              : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                          )}
                        >
                          <div className="w-6 h-6 shrink-0">
                            <ExerciseIcon
                              name={ex.name}
                              muscleGroup={ex.muscleGroup as MuscleGroup}
                              className="w-full h-full"
                            />
                          </div>
                          <span className={cn(
                            "flex-1 text-sm capitalize",
                            isPlanned
                              ? "font-semibold text-emerald-700 dark:text-emerald-300"
                              : "text-zinc-700 dark:text-zinc-300"
                          )}>
                            {ex.name.toLowerCase()}
                          </span>
                          <div className="w-5 h-5 shrink-0 flex items-center justify-center">
                            {isThisPending ? (
                              <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                            ) : isPlanned ? (
                              <Check className="h-4 w-4 text-emerald-500" />
                            ) : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-zinc-100 dark:border-zinc-800 shrink-0">
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-emerald-500 text-white text-sm font-semibold py-2.5 hover:bg-emerald-600 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
