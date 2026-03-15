"use client";

import { useState, useEffect, useRef, useCallback, useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Trash2, SlidersHorizontal } from "lucide-react";
import { Toast } from "@/components/ui/Toast";
import { ExerciseGroup } from "./ExerciseGroup";
import { TrackingMode } from "./TrackingMode";
import { AddCustomExercise } from "./AddCustomExercise";
import { DeleteExerciseModal } from "./DeleteExerciseModal";
import { EditExercisesOverlay } from "./EditExercisesOverlay";
import { WorkoutWeekView, getWeekDates } from "./WorkoutWeekView";
import { WorkoutMonthView, getMonthRange } from "./WorkoutMonthView";
import {
  saveWorkout,
  getWorkoutForDate,
  getLastKnownSets,
  getWorkoutsForRange,
  deleteWorkoutSessionByDate,
  deleteExerciseTracking,
} from "@/actions/workout";
import { togglePin, getExercises } from "@/actions/exercise";
import {
  getBlocksForRange,
  excuseMissedDay,
  revokeSorryExcuse,
} from "@/actions/planner";
import { MUSCLE_GROUP_ORDER, MUSCLE_GROUP_LABELS } from "@/constants/exercises";
import { todayISODate } from "@/lib/utils";
import type { ExerciseWithSettings, SetData, MuscleGroup } from "@/types";
import type { WorkoutDayData } from "@/lib/services/workoutService";
import type { PlannerBlockInfo } from "@/actions/planner";

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
  const [plannerData, setPlannerData] = useState<{ blocksByDate: Record<string, PlannerBlockInfo[]>; sorryRemaining: number } | null>(null);
  const [sorryConfirm, setSorryConfirm] = useState(false);

  const [trackingScope, setTrackingScope] = useState<"all" | "FULL_BODY" | MuscleGroup | null>(() => {
    const section = searchParams.get("section");
    if (section === "FULL_BODY") return "FULL_BODY";
    if (section && (MUSCLE_GROUP_ORDER as readonly string[]).includes(section)) return section as MuscleGroup;
    return null;
  });
  const [skippedByDate, setSkippedByDate] = useState<Record<string, Set<string>>>({});
  const skippedIds = skippedByDate[selectedDate] ?? new Set<string>();
  const [savingGroups, setSavingGroups] = useState<Set<MuscleGroup>>(new Set());
  const [lastSavedByGroup, setLastSavedByGroup] = useState<Partial<Record<MuscleGroup, Date>>>({});
  const [lastSavedAll, setLastSavedAll] = useState<Date | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [addTargetGroup, setAddTargetGroup] = useState<MuscleGroup | null>(null);
  const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleteConfirming, setIsDeleteConfirming] = useState(false);
  const [showEditExercises, setShowEditExercises] = useState(false);
  const [isPending, startTransition] = useTransition();

  // If we already opened tracking from the URL param, mark as done so the effect doesn't re-fire
  const didScrollRef = useRef(!!searchParams.get("section"));
  const fromPlannerRef = useRef(!!searchParams.get("section") || searchParams.get("from") === "planner");

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
        const targetSets = ex.preferredSets ?? (ex.isBodyweight ? BODYWEIGHT_SETS : DEFAULT_SETS);
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
    setSorryConfirm(false);
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

  // Load range data for calendar dots + planner blocks
  useEffect(() => {
    setIsRangeLoading(true);
    Promise.all([
      getWorkoutsForRange(rangeStart, rangeEnd),
      getBlocksForRange(rangeStart, rangeEnd),
    ]).then(([workoutResult, plannerResult]) => {
      if (workoutResult.success && workoutResult.data) setRangeData(workoutResult.data);
      if (plannerResult.success && plannerResult.data) setPlannerData(plannerResult.data);
      setIsRangeLoading(false);
    });
  }, [rangeStart, rangeEnd]);

  // Auto-open tracking mode from planner ?section= param
  useEffect(() => {
    if (isLoading || didScrollRef.current) return;
    const section = searchParams.get("section");
    if (!section) return;
    didScrollRef.current = true;
    if (section === "FULL_BODY") {
      setTrackingScope("FULL_BODY");
    } else if ((MUSCLE_GROUP_ORDER as readonly string[]).includes(section)) {
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
    Promise.all([
      getWorkoutsForRange(rangeStart, rangeEnd),
      getBlocksForRange(rangeStart, rangeEnd),
    ]).then(([workoutResult, plannerResult]) => {
      if (workoutResult.success && workoutResult.data) setRangeData(workoutResult.data);
      if (plannerResult.success && plannerResult.data) setPlannerData(plannerResult.data);
    });
  };

  const handleExercisesChanged = () => {
    getExercises().then((result) => {
      if (result.success && result.data) setExercises(result.data);
    });
  };

  const handleSkipChange = (id: string, skipped: boolean) => {
    setSkippedByDate((prev) => {
      const current = new Set(prev[selectedDate] ?? []);
      if (skipped) current.add(id); else current.delete(id);
      return { ...prev, [selectedDate]: current };
    });
  };

  const handleSave = () => {
    startTransition(async () => {
      const exerciseInputs = exercises
        .filter((ex) => !skippedIds.has(ex.id))
        .map((ex) => ({
          exerciseId: ex.id,
          sets: workoutData[ex.id] ?? [],
        }));
      const result = await saveWorkout({ date: selectedDate, exercises: exerciseInputs });
      if (result.success) {
        setLastSavedAll(new Date());
        refreshSavedIds(workoutData, exercises.filter((ex) => !skippedIds.has(ex.id)));
        refreshRangeData();
        setToast({ message: "Workout saved ✓", type: "success" });
      } else {
        setToast({ message: result.error ?? "Failed to save", type: "error" });
      }
    });
  };

  const [isSavingFullBody, setIsSavingFullBody] = useState(false);

  const handleSaveFullBody = () => {
    setIsSavingFullBody(true);
    startTransition(async () => {
      const fullBodyExercises = sortedExercises.filter(
        (ex) => (ex.muscleGroup === "UPPER_BODY" || ex.muscleGroup === "LOWER_BODY") && !skippedIds.has(ex.id)
      );
      const result = await saveWorkout({
        date: selectedDate,
        exercises: fullBodyExercises.map((ex) => ({ exerciseId: ex.id, sets: workoutData[ex.id] ?? [] })),
      });
      if (result.success) {
        setLastSavedAll(new Date());
        refreshSavedIds(workoutData, fullBodyExercises);
        refreshRangeData();
        setToast({ message: "Full Body saved ✓", type: "success" });
      } else {
        setToast({ message: result.error ?? "Failed to save", type: "error" });
      }
      setIsSavingFullBody(false);
    });
  };

  const handleSaveGroup = (mg: MuscleGroup) => {
    setSavingGroups((prev) => new Set(prev).add(mg));
    startTransition(async () => {
      const groupExercises = exercises.filter((ex) => ex.muscleGroup === mg && !skippedIds.has(ex.id));
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

  const handleDeleteExerciseTracking = (exerciseId: string) => {
    const ex = exercises.find((e) => e.id === exerciseId);
    if (!ex) return;
    startTransition(async () => {
      await deleteExerciseTracking(exerciseId, selectedDate);
      const lastResult = await getLastKnownSets();
      const lastKnown = lastResult.success && lastResult.data ? lastResult.data : {};
      const prefill = initializeSets([ex], lastKnown[exerciseId] ? { [exerciseId]: lastKnown[exerciseId]! } : {});
      setSavedTodayIds((prev) => { const next = new Set(prev); next.delete(exerciseId); return next; });
      setWorkoutData((prev) => ({ ...prev, [exerciseId]: prefill[exerciseId] ?? makeEmptySets(ex.preferredSets ?? (ex.isBodyweight ? BODYWEIGHT_SETS : DEFAULT_SETS)) }));
      refreshRangeData();
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
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      router.push("/planner");
    } else {
      setTrackingScope(null);
    }
  };

  const handleExcuseMissed = () => {
    startTransition(async () => {
      const result = await excuseMissedDay(selectedDate);
      if (result.success) {
        setSorryConfirm(false);
        refreshRangeData();
        setToast({ message: "Sorry token applied", type: "success" });
      } else {
        setToast({ message: result.error ?? "Failed to apply sorry token", type: "error" });
      }
    });
  };

  const handleRevokeSorry = () => {
    startTransition(async () => {
      const result = await revokeSorryExcuse(selectedDate);
      if (result.success) {
        refreshRangeData();
        setToast({ message: "Sorry token revoked", type: "success" });
      } else {
        setToast({ message: result.error ?? "Failed to revoke sorry token", type: "error" });
      }
    });
  };

  const hasWorkoutForDate = savedTodayIds.size > 0;

  // Sorry token derived state for selected date
  const blocksForDate = plannerData?.blocksByDate[selectedDate] ?? [];
  const allBlocksExcused = blocksForDate.length > 0 && blocksForDate.every((b) => b.sorryExcused);
  const hasUnexcusedBlocks = blocksForDate.some((b) => !b.sorryExcused);
  const todayISO = todayISODate();
  const isSelectedPast = selectedDate < todayISO;
  const isMissedDate = !hasWorkoutForDate && isSelectedPast && hasUnexcusedBlocks;
  const isFutureExcusable = !hasWorkoutForDate && !isSelectedPast && blocksForDate.length > 0 && !allBlocksExcused;
  const sorryRemaining = plannerData?.sorryRemaining ?? 0;
  const showSorrySection = (isMissedDate || isFutureExcusable || allBlocksExcused) && blocksForDate.length > 0;

  // Determine which block types are due (non-excused planned blocks)
  const dueBlockTypes = new Set(blocksForDate.filter((b) => !b.sorryExcused).map((b) => b.blockType));
  const isFullBodyDay = dueBlockTypes.has("FULL_BODY");

  // Muscle groups to show as standalone (excludes UB/LB when Full Body section handles them)
  const standaloneGroups: MuscleGroup[] = (() => {
    const isDue = (mg: MuscleGroup) => dueBlockTypes.has(mg);
    const available = isFullBodyDay
      ? MUSCLE_GROUP_ORDER.filter((mg) => mg !== "UPPER_BODY" && mg !== "LOWER_BODY")
      : MUSCLE_GROUP_ORDER;
    return [...available.filter(isDue), ...available.filter((mg) => !isDue(mg))];
  })();

  // Muscle groups that are due (planned, non-excused) for selected date — always editable
  const dueGroupMuscles = new Set<string>();
  if (isFullBodyDay) {
    dueGroupMuscles.add("UPPER_BODY");
    dueGroupMuscles.add("LOWER_BODY");
  }
  dueBlockTypes.forEach((bt) => {
    if (bt !== "FULL_BODY") dueGroupMuscles.add(bt);
  });

  // A group is interactive only if it's a due group, or there are no due groups at all (free day)
  const isGroupEditable = (mg: MuscleGroup) =>
    dueGroupMuscles.has(mg) || dueGroupMuscles.size === 0;

  // Exercises in non-due groups are read-only whenever due groups exist (any date)
  const readOnlyIds = new Set(
    exercises
      .filter(
        (ex) =>
          !savedTodayIds.has(ex.id) &&
          dueGroupMuscles.size > 0 &&
          !dueGroupMuscles.has(ex.muscleGroup)
      )
      .map((ex) => ex.id)
  );

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

        {selectedDate !== todayISODate() && (
          <button
            onClick={() => setSelectedDate(todayISODate())}
            className="px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Today
          </button>
        )}

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
          plannerBlocksByDate={plannerData?.blocksByDate}
        />
      ) : (
        <WorkoutMonthView
          anchorDate={selectedDate}
          data={rangeData}
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          plannerBlocksByDate={plannerData?.blocksByDate}
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

      {/* Sorry token section for selected date */}
      {showSorrySection && (
        <div className="flex items-center gap-2 text-xs py-0.5">
          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border-2 border-amber-400 bg-amber-100 dark:border-amber-500 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 font-bold text-[8px] leading-none shrink-0">S</span>
          {/* Past missed */}
          {isMissedDate && !sorryConfirm && sorryRemaining > 0 && (
            <button
              onClick={() => setSorryConfirm(true)}
              className="text-amber-600 dark:text-amber-400 font-medium hover:underline"
            >
              Use sorry token ({sorryRemaining} left) — Excuse this miss
            </button>
          )}
          {isMissedDate && !sorryConfirm && sorryRemaining === 0 && (
            <span className="text-zinc-400 dark:text-zinc-500">No sorry tokens left this month</span>
          )}
          {isMissedDate && sorryConfirm && (
            <>
              <span className="text-zinc-500 dark:text-zinc-400">Excuse this miss? (cannot undo)</span>
              <button
                onClick={handleExcuseMissed}
                disabled={isPending}
                className="rounded px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-semibold hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors disabled:opacity-50"
              >
                Confirm
              </button>
              <button
                onClick={() => setSorryConfirm(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                Cancel
              </button>
            </>
          )}
          {/* Today/future excusable */}
          {isFutureExcusable && sorryRemaining > 0 && (
            <button
              onClick={handleExcuseMissed}
              disabled={isPending}
              className="text-amber-600 dark:text-amber-400 font-medium hover:underline disabled:opacity-50"
            >
              Use sorry token
            </button>
          )}
          {isFutureExcusable && sorryRemaining === 0 && (
            <span className="text-zinc-400 dark:text-zinc-500">No sorry tokens left this month</span>
          )}
          {/* Already excused past — read-only */}
          {allBlocksExcused && isSelectedPast && (
            <span className="text-zinc-400 dark:text-zinc-500">Sorry token used — excused</span>
          )}
          {/* Already excused today/future — can revoke */}
          {allBlocksExcused && !isSelectedPast && (
            <>
              <span className="text-zinc-400 dark:text-zinc-500">Sorry token used</span>
              <button
                onClick={handleRevokeSorry}
                disabled={isPending}
                className="text-zinc-500 dark:text-zinc-400 hover:underline disabled:opacity-50"
              >
                Revoke
              </button>
            </>
          )}
        </div>
      )}

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
          {/* Full Body combined section */}
          {isFullBodyDay && (
            <div className="rounded-xl border-2 border-orange-300 dark:border-orange-700 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 bg-orange-50 dark:bg-orange-950/20">
                <span className="flex items-center gap-2 font-semibold text-sm text-orange-600 dark:text-orange-400">
                  <span>Full Body</span>
                  <span className="text-xs font-normal opacity-60">
                    {(exercisesByGroup["UPPER_BODY"]?.length ?? 0) + (exercisesByGroup["LOWER_BODY"]?.length ?? 0)} exercises
                  </span>
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleSaveFullBody}
                    disabled={isSavingFullBody || isPending}
                    className="rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 px-2 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 transition-colors disabled:opacity-50"
                  >
                    Save All
                  </button>
                  {selectedDate <= todayISO && (
                    <button
                      onClick={() => setTrackingScope("FULL_BODY")}
                      className="rounded-lg bg-emerald-500 hover:bg-emerald-600 px-2 py-1 text-xs font-semibold text-white transition-colors"
                    >
                      Track Mode
                    </button>
                  )}
                </div>
              </div>
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                <ExerciseGroup
                  muscleGroup="UPPER_BODY"
                  exercises={exercisesByGroup["UPPER_BODY"]}
                  workoutData={workoutData}
                  onSetsChange={handleSetsChange}
                  onTogglePin={handleTogglePin}
                  onRemove={handleRemoveClick}
                  defaultOpen={true}
                  onSave={exercisesByGroup["UPPER_BODY"].length > 0 ? () => handleSaveGroup("UPPER_BODY") : undefined}
                  isSaving={savingGroups.has("UPPER_BODY")}
                  lastSaved={lastSavedByGroup["UPPER_BODY"] ?? null}
                  onAdd={() => setAddTargetGroup("UPPER_BODY")}
                  readOnlyIds={readOnlyIds}
                  trackedIds={savedTodayIds}
                  onDeleteTracking={handleDeleteExerciseTracking}
                  skippedIds={skippedIds}
                  onSkipChange={handleSkipChange}
                  isNested
                />
                <ExerciseGroup
                  muscleGroup="LOWER_BODY"
                  exercises={exercisesByGroup["LOWER_BODY"]}
                  workoutData={workoutData}
                  onSetsChange={handleSetsChange}
                  onTogglePin={handleTogglePin}
                  onRemove={handleRemoveClick}
                  defaultOpen={true}
                  onSave={exercisesByGroup["LOWER_BODY"].length > 0 ? () => handleSaveGroup("LOWER_BODY") : undefined}
                  isSaving={savingGroups.has("LOWER_BODY")}
                  lastSaved={lastSavedByGroup["LOWER_BODY"] ?? null}
                  onAdd={() => setAddTargetGroup("LOWER_BODY")}
                  readOnlyIds={readOnlyIds}
                  trackedIds={savedTodayIds}
                  onDeleteTracking={handleDeleteExerciseTracking}
                  skippedIds={skippedIds}
                  onSkipChange={handleSkipChange}
                  isNested
                />
              </div>
            </div>
          )}

          {/* Standalone groups — due ones first, then the rest */}
          {standaloneGroups.map((mg) => (
            <div key={mg} id={`section-${mg}`}>
              <ExerciseGroup
                muscleGroup={mg}
                exercises={exercisesByGroup[mg]}
                workoutData={workoutData}
                onSetsChange={handleSetsChange}
                onTogglePin={handleTogglePin}
                onRemove={handleRemoveClick}
                defaultOpen={isGroupEditable(mg)}
                onSave={isGroupEditable(mg) && exercisesByGroup[mg].length > 0 ? () => handleSaveGroup(mg) : undefined}
                isSaving={savingGroups.has(mg)}
                lastSaved={lastSavedByGroup[mg] ?? null}
                onTrack={isGroupEditable(mg) && exercisesByGroup[mg].length > 0 && selectedDate <= todayISO ? () => setTrackingScope(mg) : undefined}
                onAdd={isGroupEditable(mg) ? () => setAddTargetGroup(mg) : undefined}
                readOnlyIds={readOnlyIds}
                trackedIds={savedTodayIds}
                onDeleteTracking={handleDeleteExerciseTracking}
                skippedIds={skippedIds}
                onSkipChange={handleSkipChange}
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
            <button
              onClick={() => setShowEditExercises(true)}
              className="flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
            >
              <SlidersHorizontal className="h-3 w-3" />
              Edit
            </button>
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

      {/* Edit exercises overlay */}
      {showEditExercises && (
        <EditExercisesOverlay
          allExercises={sortedExercises}
          onClose={(changed) => {
            setShowEditExercises(false);
            if (changed) handleExercisesChanged();
          }}
        />
      )}

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
              : trackingScope === "FULL_BODY"
                ? sortedExercises.filter((e) => e.muscleGroup === "UPPER_BODY" || e.muscleGroup === "LOWER_BODY")
                : sortedExercises.filter((e) => e.muscleGroup === trackingScope);
          const scopeLabel =
            trackingScope === "all"
              ? "All Exercises"
              : trackingScope === "FULL_BODY"
                ? "Full Body"
                : MUSCLE_GROUP_LABELS[trackingScope as MuscleGroup];
          return (
            <TrackingMode
              exercises={trackingExercises}
              date={selectedDate}
              initialCompletedIds={new Set(savedTodayIds)}
              scopeLabel={scopeLabel}
              workoutData={workoutData}
              skippedIds={skippedIds}
              onSkipChange={handleSkipChange}
              onBack={handleTrackingBack}
              onExit={() => {
                setTrackingScope(null);
                if (fromPlannerRef.current) {
                  document.documentElement.scrollTop = 0;
                  document.body.scrollTop = 0;
                  router.push("/planner");
                }
              }}
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
