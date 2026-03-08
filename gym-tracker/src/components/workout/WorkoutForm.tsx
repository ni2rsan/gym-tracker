"use client";

import { useState, useEffect, useRef, useCallback, useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Save, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";
import { ExerciseGroup } from "./ExerciseGroup";
import { TrackingMode } from "./TrackingMode";
import { AddCustomExercise } from "./AddCustomExercise";
import { DeleteExerciseModal } from "./DeleteExerciseModal";
import { WorkoutWeekView, getWeekDates } from "./WorkoutWeekView";
import { WorkoutMonthView, getMonthRange } from "./WorkoutMonthView";
import {
  saveWorkout,
  getWorkoutForDate,
  getLastKnownSets,
  getWorkoutsForRange,
  deleteWorkoutSessionByDate,
} from "@/actions/workout";
import { togglePin } from "@/actions/exercise";
import { MUSCLE_GROUP_ORDER, MUSCLE_GROUP_LABELS } from "@/constants/exercises";
import { todayISODate } from "@/lib/utils";
import type { ExerciseWithSettings, SetData, MuscleGroup } from "@/types";
import type { WorkoutDayData } from "@/lib/services/workoutService";

type ViewMode = "week" | "month";
type ToastState = { message: string; type: "success" | "error" } | null;

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

export function WorkoutForm({ initialExercises, initialDate }: WorkoutFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [exercises, setExercises] = useState(initialExercises);
  const [selectedDate, setSelectedDate] = useState(initialDate ?? todayISODate());
  const [workoutData, setWorkoutData] = useState<Record<string, SetData[]>>({});
  const [savedTodayIds, setSavedTodayIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [rangeData, setRangeData] = useState<WorkoutDayData[]>([]);
  const [isRangeLoading, setIsRangeLoading] = useState(false);

  const [trackingScope, setTrackingScope] = useState<"all" | MuscleGroup | null>(null);
  const [savingGroups, setSavingGroups] = useState<Set<MuscleGroup>>(new Set());
  const [lastSavedByGroup, setLastSavedByGroup] = useState<Partial<Record<MuscleGroup, Date>>>({});
  const [lastSavedAll, setLastSavedAll] = useState<Date | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [addTargetGroup, setAddTargetGroup] = useState<MuscleGroup | null>(null);
  const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleteConfirming, setIsDeleteConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  const didScrollRef = useRef(false);
  const fromPlannerRef = useRef(!!searchParams.get("section"));

  // Derive range dates from selectedDate + viewMode
  const rangeStart =
    viewMode === "week" ? getWeekDates(selectedDate)[0] : getMonthRange(selectedDate).start;
  const rangeEnd =
    viewMode === "week" ? getWeekDates(selectedDate)[6] : getMonthRange(selectedDate).end;

  const initializeSets = useCallback(
    (
      exList: ExerciseWithSettings[],
      existing: Record<string, Array<{ setNumber: number; reps: number; weightKg: number | null }>>
    ) => {
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

  // Load saved sets for selected date (+ last-known prefill)
  useEffect(() => {
    setIsLoading(true);
    setLastSavedAll(null);
    setLastSavedByGroup({});
    setIsDeleteConfirming(false);
    Promise.all([getWorkoutForDate(selectedDate), getLastKnownSets()]).then(
      ([dateResult, lastResult]) => {
        const existing = dateResult.success && dateResult.data ? dateResult.data : {};
        const lastKnown = lastResult.success && lastResult.data ? lastResult.data : {};
        const merged = { ...lastKnown, ...existing };
        setWorkoutData(initializeSets(exercises, merged));
        setSavedTodayIds(
          new Set(Object.keys(existing).filter((id) => existing[id]?.length > 0))
        );
        setIsLoading(false);
      }
    );
  }, [selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load range data for calendar dots
  useEffect(() => {
    setIsRangeLoading(true);
    getWorkoutsForRange(rangeStart, rangeEnd).then((result) => {
      if (result.success && result.data) setRangeData(result.data);
      setIsRangeLoading(false);
    });
  }, [rangeStart, rangeEnd]);

  // Auto-open tracking mode from planner ?section= param
  useEffect(() => {
    if (isLoading || didScrollRef.current) return;
    const section = searchParams.get("section");
    if (!section) return;
    didScrollRef.current = true;
    if ((MUSCLE_GROUP_ORDER as readonly string[]).includes(section)) {
      setTrackingScope(section as MuscleGroup);
    }
  }, [isLoading, searchParams]);

  function navigate(direction: -1 | 1) {
    const d = new Date(selectedDate + "T12:00:00");
    if (viewMode === "week") {
      d.setDate(d.getDate() + direction * 7);
    } else {
      d.setMonth(d.getMonth() + direction);
      d.setDate(1);
    }
    setSelectedDate(d.toISOString().split("T")[0]);
  }

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

  const refreshSavedIds = (data: Record<string, SetData[]>, exList: ExerciseWithSettings[]) => {
    setSavedTodayIds((prev) => {
      const next = new Set(prev);
      exList.forEach((ex) => {
        if ((data[ex.id] ?? []).some((s) => Number(s.reps) > 0)) next.add(ex.id);
      });
      return next;
    });
  };

  const refreshRangeData = () => {
    getWorkoutsForRange(rangeStart, rangeEnd).then((result) => {
      if (result.success && result.data) setRangeData(result.data);
    });
  };

  const handleSave = () => {
    startTransition(async () => {
      const exerciseInputs = exercises.map((ex) => ({
        exerciseId: ex.id,
        sets: workoutData[ex.id] ?? [],
      }));
      const result = await saveWorkout({ date: selectedDate, exercises: exerciseInputs });
      if (result.success) {
        setLastSavedAll(new Date());
        refreshSavedIds(workoutData, exercises);
        refreshRangeData();
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
      const result = await saveWorkout({ date: selectedDate, exercises: exerciseInputs });
      if (result.success) {
        setLastSavedByGroup((prev) => ({ ...prev, [mg]: new Date() }));
        refreshSavedIds(workoutData, groupExercises);
        refreshRangeData();
        setToast({ message: `${MUSCLE_GROUP_LABELS[mg]} saved ✓`, type: "success" });
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

  const handleDeleteWorkout = () => {
    startTransition(async () => {
      const result = await deleteWorkoutSessionByDate(selectedDate);
      if (result.success) {
        // Reload day data + range data
        const [dateResult, lastResult, rangeResult] = await Promise.all([
          getWorkoutForDate(selectedDate),
          getLastKnownSets(),
          getWorkoutsForRange(rangeStart, rangeEnd),
        ]);
        const existing = dateResult.success && dateResult.data ? dateResult.data : {};
        const lastKnown = lastResult.success && lastResult.data ? lastResult.data : {};
        setWorkoutData(initializeSets(exercises, { ...lastKnown, ...existing }));
        setSavedTodayIds(new Set(Object.keys(existing).filter((id) => existing[id]?.length > 0)));
        setLastSavedAll(null);
        setLastSavedByGroup({});
        setIsDeleteConfirming(false);
        if (rangeResult.success && rangeResult.data) setRangeData(rangeResult.data);
        setToast({ message: "Workout deleted", type: "success" });
      } else {
        setToast({ message: result.error ?? "Failed to delete", type: "error" });
      }
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

  const lastSavedTime =
    lastSavedAll ??
    Object.values(lastSavedByGroup).reduce<Date | null>(
      (latest, d) => (!latest || (d && d > latest) ? d ?? null : latest),
      null
    );

  function formatLastSaved(d: Date | null): string {
    if (!d) return "";
    const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
    if (diffMin < 1) return "Saved just now";
    return `Saved ${diffMin}m ago`;
  }

  function selectedDateLabel(): string {
    const today = todayISODate();
    if (selectedDate === today) return "Today";
    const d = new Date(selectedDate + "T12:00:00");
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (selectedDate === yesterday.toISOString().split("T")[0]) return "Yesterday";
    return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  }

  function rangeLabel(): string {
    if (viewMode === "week") {
      const start = new Date(rangeStart + "T12:00:00");
      const end = new Date(rangeEnd + "T12:00:00");
      return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    }
    return new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }

  const handleTrackingBack = () => {
    if (fromPlannerRef.current) {
      router.push("/planner");
    } else {
      setTrackingScope(null);
    }
  };

  const hasWorkoutForDate = savedTodayIds.size > 0;

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Range navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setSelectedDate(todayISODate())}
            className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors min-w-[140px] text-center"
          >
            {rangeLabel()}
          </button>
          <button
            onClick={() => navigate(1)}
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1" />

        {/* Week / Month tabs */}
        <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
          {(["week", "month"] as ViewMode[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setViewMode(tab)}
              className={
                tab === viewMode
                  ? "px-3 py-1.5 text-xs font-semibold bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 transition-colors"
                  : "px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              }
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => setTrackingScope("all")}
          disabled={isLoading}
        >
          Track All
        </Button>
        <Button size="sm" onClick={handleSave} loading={isPending} disabled={isLoading}>
          <Save className="h-3.5 w-3.5" />
          Save All
        </Button>
      </div>

      {/* Calendar */}
      {isRangeLoading ? (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 h-14 animate-pulse bg-zinc-100 dark:bg-zinc-800" />
      ) : viewMode === "week" ? (
        <WorkoutWeekView
          anchorDate={selectedDate}
          data={rangeData}
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
        />
      ) : (
        <WorkoutMonthView
          anchorDate={selectedDate}
          data={rangeData}
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
        />
      )}

      {/* Selected date header */}
      <div className="flex items-center gap-2 pt-1">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-white flex-1">
          {selectedDateLabel()}
        </h2>
        {lastSavedTime && (
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            {formatLastSaved(lastSavedTime)}
          </span>
        )}
        {/* Delete workout */}
        {hasWorkoutForDate && !isDeleteConfirming && (
          <button
            onClick={() => setIsDeleteConfirming(true)}
            className="flex items-center justify-center w-7 h-7 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-colors"
            title="Delete this day's workout"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
        {isDeleteConfirming && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Delete workout?</span>
            <button
              onClick={handleDeleteWorkout}
              disabled={isPending}
              className="rounded-md bg-red-500 hover:bg-red-600 disabled:opacity-60 px-2.5 py-1 text-xs font-semibold text-white transition-colors"
            >
              Delete
            </button>
            <button
              onClick={() => setIsDeleteConfirming(false)}
              className="rounded-md border border-zinc-200 dark:border-zinc-700 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Exercise groups */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-zinc-200 dark:border-zinc-800 h-16 animate-pulse bg-zinc-100 dark:bg-zinc-800"
            />
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
                onTrack={exercisesByGroup[mg].length > 0 ? () => setTrackingScope(mg) : undefined}
                onAdd={() => setAddTargetGroup(mg)}
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
              {selectedDateLabel()}
              {lastSavedTime ? ` · ${formatLastSaved(lastSavedTime)}` : ""}
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
        open={addTargetGroup !== null}
        onClose={() => setAddTargetGroup(null)}
        onCreated={() => window.location.reload()}
        defaultMuscleGroup={addTargetGroup ?? undefined}
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
        <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      )}

      {/* Tracking mode overlay */}
      {trackingScope !== null &&
        (() => {
          const trackingExercises =
            trackingScope === "all"
              ? sortedExercises
              : sortedExercises.filter((e) => e.muscleGroup === trackingScope);
          const scopeLabel =
            trackingScope === "all"
              ? "All Exercises"
              : MUSCLE_GROUP_LABELS[trackingScope as MuscleGroup];
          return (
            <TrackingMode
              exercises={trackingExercises}
              date={selectedDate}
              initialCompletedIds={new Set(savedTodayIds)}
              scopeLabel={scopeLabel}
              workoutData={workoutData}
              onBack={handleTrackingBack}
              onExit={() => setTrackingScope(null)}
              onExerciseSaved={(exerciseId, sets) => {
                setWorkoutData((prev) => ({ ...prev, [exerciseId]: sets }));
                setSavedTodayIds((prev) => new Set(prev).add(exerciseId));
                refreshRangeData();
              }}
            />
          );
        })()}
    </div>
  );
}
