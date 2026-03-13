"use client";

import { useState, useTransition } from "react";
import { Dumbbell, Scale, Trash2, Pencil, Check, X } from "lucide-react";
import { deleteWorkoutSessionByDate, changeWorkoutSessionDate, deleteExerciseTracking } from "@/actions/workout";
import { deleteBodyMetricEntry } from "@/actions/metrics";

// Serialized versions of log entry types (Dates → strings for RSC→client boundary)
export type SerializedWorkoutEntry = {
  type: "workout";
  id: string;
  timestamp: string; // ISO string
  workoutDate: string;
  exercises: {
    exerciseId: string;
    name: string;
    isBodyweight: boolean;
    isCardio: boolean;
    sets: { setNumber: number; reps: number; weightKg: number | null }[];
  }[];
};

export type SerializedMetricEntry = {
  type: "metric";
  id: string;
  timestamp: string; // ISO string
  weightKg: number | null;
  bodyFatPct: number | null;
  notes: string | null;
};

export type SerializedLogEntry = SerializedWorkoutEntry | SerializedMetricEntry;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(isoString: string) {
  return new Date(isoString).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatWorkoutDate(isoDate: string) {
  const d = new Date(isoDate + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

function getDayLabel(isoString: string) {
  const now = new Date();
  const d = new Date(isoString);
  const diffDays = Math.floor(
    (Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) -
      Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())) /
      86_400_000
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function getDayKey(isoString: string) {
  return new Date(isoString).toISOString().split("T")[0];
}

function formatKg(val: number | null) {
  if (val === null) return null;
  return val % 1 === 0 ? `${val}` : val.toFixed(1);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function WorkoutEntry({
  entry,
  onDelete,
  isDeleting,
  onDateChange,
  onDeleteExercise,
}: {
  entry: SerializedWorkoutEntry;
  onDelete: () => void;
  isDeleting: boolean;
  onDateChange: (newDate: string) => void;
  onDeleteExercise: (exerciseId: string) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDeleteExId, setConfirmDeleteExId] = useState<string | null>(null);
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [editDate, setEditDate] = useState(entry.workoutDate);
  const [, startDateTransition] = useTransition();

  const handleSaveDate = () => {
    if (editDate === entry.workoutDate) {
      setIsEditingDate(false);
      return;
    }
    startDateTransition(async () => {
      const result = await changeWorkoutSessionDate(entry.id, editDate);
      if (result.success) {
        onDateChange(editDate);
        setIsEditingDate(false);
      }
    });
  };

  const handleCancelDate = () => {
    setEditDate(entry.workoutDate);
    setIsEditingDate(false);
  };

  return (
    <div className="group relative flex gap-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:ring-emerald-800/50">
        <Dumbbell className="h-4 w-4" strokeWidth={2.5} />
      </div>

      <div className="flex-1 min-w-0 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-zinc-900 dark:text-white">Workout</p>
            {isEditingDate ? (
              <div className="flex items-center gap-1.5 mt-0.5">
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="text-xs rounded-md border border-zinc-300 bg-zinc-50 px-1.5 py-0.5 text-zinc-900 focus:border-emerald-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                />
                <button
                  onClick={handleSaveDate}
                  className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                  title="Save date"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={handleCancelDate}
                  className="text-zinc-400 hover:text-zinc-600"
                  title="Cancel"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 mt-0.5">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {formatWorkoutDate(entry.workoutDate)}
                </p>
                <button
                  onClick={() => setIsEditingDate(true)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-zinc-600"
                  title="Edit date"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <time className="text-xs tabular-nums text-zinc-400 dark:text-zinc-500 mt-0.5">
              {formatTime(entry.timestamp)}
            </time>
            {confirmDelete ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={onDelete}
                  disabled={isDeleting}
                  className="text-xs text-red-500 font-semibold hover:text-red-600"
                >
                  Delete
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-xs text-zinc-400 hover:text-zinc-600"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-red-500"
                title="Delete workout"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          {entry.exercises.map((ex) => (
            <div key={ex.exerciseId} className="group/ex flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-xs font-semibold tracking-wide text-zinc-700 dark:text-zinc-300 uppercase shrink-0">
                {ex.name}
              </span>
              {ex.isCardio ? (
                <span className="inline-flex items-center rounded-md bg-rose-50 px-1.5 py-0.5 text-xs text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                  {ex.sets[0]?.reps ?? 0} min
                </span>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {ex.sets.map((s) => (
                    <span
                      key={s.setNumber}
                      className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                    >
                      <span className="font-medium text-zinc-400 dark:text-zinc-500">S{s.setNumber}</span>
                      {ex.isBodyweight ? (
                        <span>{s.reps} reps</span>
                      ) : (
                        <span>
                          {s.reps}r
                          {s.weightKg !== null && (
                            <> · <span className="text-emerald-600 dark:text-emerald-400 font-medium">{formatKg(s.weightKg)} kg</span></>
                          )}
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              )}
              {confirmDeleteExId === ex.exerciseId ? (
                <div className="flex items-center gap-1 ml-auto">
                  <button
                    onClick={() => { setConfirmDeleteExId(null); onDeleteExercise(ex.exerciseId); }}
                    className="text-xs text-red-500 font-semibold hover:text-red-600"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setConfirmDeleteExId(null)}
                    className="text-xs text-zinc-400 hover:text-zinc-600"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDeleteExId(ex.exerciseId)}
                  className="opacity-0 group-hover/ex:opacity-100 transition-opacity ml-auto shrink-0 text-zinc-400 hover:text-red-500"
                  title="Delete exercise entry"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricEntry({
  entry,
  onDelete,
  isDeleting,
}: {
  entry: SerializedMetricEntry;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const hasWeight = entry.weightKg !== null;
  const hasBodyFat = entry.bodyFatPct !== null;

  return (
    <div className="group relative flex gap-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:ring-blue-800/50">
        <Scale className="h-4 w-4" strokeWidth={2.5} />
      </div>

      <div className="flex-1 min-w-0 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-zinc-900 dark:text-white mb-2">Body Metrics</p>
            <div className="flex flex-wrap gap-3">
              {hasWeight && (
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">Weight</span>
                  <span className="text-sm font-bold text-zinc-900 dark:text-white">
                    {formatKg(entry.weightKg)}
                    <span className="text-xs font-normal text-zinc-400 ml-0.5">kg</span>
                  </span>
                </div>
              )}
              {hasBodyFat && (
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">Body Fat</span>
                  <span className="text-sm font-bold text-zinc-900 dark:text-white">
                    {formatKg(entry.bodyFatPct)}
                    <span className="text-xs font-normal text-zinc-400 ml-0.5">%</span>
                  </span>
                </div>
              )}
            </div>
            {entry.notes && (
              <p className="mt-1.5 text-xs text-zinc-400 dark:text-zinc-500 italic">{entry.notes}</p>
            )}
          </div>
          <div className="flex items-start gap-2 shrink-0">
            <time className="text-xs tabular-nums text-zinc-400 dark:text-zinc-500 mt-0.5">
              {formatTime(entry.timestamp)}
            </time>
            {confirmDelete ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={onDelete}
                  disabled={isDeleting}
                  className="text-xs text-red-500 font-semibold hover:text-red-600"
                >
                  Delete
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-xs text-zinc-400 hover:text-zinc-600"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-red-500"
                title="Delete entry"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function LogsList({ initialEntries }: { initialEntries: SerializedLogEntry[] }) {
  const [entries, setEntries] = useState<SerializedLogEntry[]>(initialEntries);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  const handleDeleteWorkout = (entry: SerializedWorkoutEntry) => {
    setDeletingIds((prev) => new Set(prev).add(entry.id));
    startTransition(async () => {
      const result = await deleteWorkoutSessionByDate(entry.workoutDate);
      if (result.success) {
        setEntries((prev) => prev.filter((e) => e.id !== entry.id));
      }
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(entry.id);
        return next;
      });
    });
  };

  const handleDeleteMetric = (entry: SerializedMetricEntry) => {
    setDeletingIds((prev) => new Set(prev).add(entry.id));
    startTransition(async () => {
      const result = await deleteBodyMetricEntry(entry.id);
      if (result.success) {
        setEntries((prev) => prev.filter((e) => e.id !== entry.id));
      }
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(entry.id);
        return next;
      });
    });
  };

  const handleDeleteExercise = (entry: SerializedWorkoutEntry, exerciseId: string) => {
    startTransition(async () => {
      const result = await deleteExerciseTracking(exerciseId, entry.workoutDate);
      if (result.success) {
        setEntries((prev) =>
          prev
            .map((e) => {
              if (e.id !== entry.id || e.type !== "workout") return e;
              const remaining = e.exercises.filter((ex) => ex.exerciseId !== exerciseId);
              if (remaining.length === 0) return null;
              return { ...e, exercises: remaining };
            })
            .filter(Boolean) as SerializedLogEntry[]
        );
      }
    });
  };

  const handleDateChange = (entryId: string, newDate: string) => {
    setEntries((prev) =>
      prev.map((e) =>
        e.id === entryId && e.type === "workout" ? { ...e, workoutDate: newDate } : e
      )
    );
  };

  if (entries.length === 0) {
    return null; // parent handles empty state
  }

  // Group by calendar day
  const groups: { label: string; key: string; entries: SerializedLogEntry[] }[] = [];
  const seenKeys = new Set<string>();
  for (const entry of entries) {
    const key = getDayKey(entry.timestamp);
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      groups.push({ label: getDayLabel(entry.timestamp), key, entries: [] });
    }
    groups[groups.length - 1].entries.push(entry);
  }

  return (
    <>
      {groups.map((group) => (
        <div key={group.key}>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest shrink-0">
              {group.label}
            </span>
            <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
          </div>

          <div className="relative space-y-3 pl-0">
            {group.entries.length > 1 && (
              <div
                className="absolute left-[17px] top-9 bottom-9 w-px bg-zinc-200 dark:bg-zinc-800 -z-10"
                aria-hidden
              />
            )}
            {group.entries.map((entry) =>
              entry.type === "workout" ? (
                <WorkoutEntry
                  key={entry.id}
                  entry={entry}
                  onDelete={() => handleDeleteWorkout(entry)}
                  isDeleting={deletingIds.has(entry.id)}
                  onDateChange={(newDate) => handleDateChange(entry.id, newDate)}
                  onDeleteExercise={(exerciseId) => handleDeleteExercise(entry, exerciseId)}
                />
              ) : (
                <MetricEntry
                  key={entry.id}
                  entry={entry}
                  onDelete={() => handleDeleteMetric(entry)}
                  isDeleting={deletingIds.has(entry.id)}
                />
              )
            )}
          </div>
        </div>
      ))}
    </>
  );
}
