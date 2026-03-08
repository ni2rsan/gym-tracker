"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TrackingMode } from "./TrackingMode";
import { WorkoutDayView } from "./WorkoutDayView";
import { WorkoutWeekView, getWeekDates } from "./WorkoutWeekView";
import { WorkoutMonthView, getMonthRange } from "./WorkoutMonthView";
import { getWorkoutForDate, getWorkoutsForRange } from "@/actions/workout";
import { MUSCLE_GROUP_ORDER, MUSCLE_GROUP_LABELS } from "@/constants/exercises";
import { todayISODate } from "@/lib/utils";
import type { ExerciseWithSettings, SetData, MuscleGroup } from "@/types";
import type { WorkoutDayData } from "@/lib/services/workoutService";

type ViewMode = "day" | "week" | "month";

interface WorkoutFormProps {
  initialExercises: ExerciseWithSettings[];
  initialDate?: string;
}

export function WorkoutForm({ initialExercises, initialDate }: WorkoutFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [exercises] = useState(initialExercises);
  const [workoutDate, setWorkoutDate] = useState(initialDate ?? todayISODate());
  const [workoutData, setWorkoutData] = useState<Record<string, SetData[]>>({});
  const [savedTodayIds, setSavedTodayIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [rangeData, setRangeData] = useState<WorkoutDayData[]>([]);
  const [isRangeLoading, setIsRangeLoading] = useState(false);

  const [trackingScope, setTrackingScope] = useState<"all" | MuscleGroup | null>(null);

  const didScrollRef = useRef(false);
  // Capture whether user arrived from the planner (section param in URL on mount)
  const fromPlannerRef = useRef(!!searchParams.get("section"));

  // Load saved data for the selected day
  useEffect(() => {
    setIsLoading(true);
    getWorkoutForDate(workoutDate).then((result) => {
      const saved = result.success && result.data ? result.data : {};
      const data: Record<string, SetData[]> = {};
      for (const [id, sets] of Object.entries(saved)) {
        data[id] = sets.map((s) => ({
          setNumber: s.setNumber,
          reps: s.reps,
          weightKg: s.weightKg ?? "",
        }));
      }
      setWorkoutData(data);
      setSavedTodayIds(new Set(Object.keys(saved)));
      setIsLoading(false);
    });
  }, [workoutDate]);

  // Load range data for week/month views
  const loadRangeData = useCallback((mode: ViewMode, date: string) => {
    if (mode === "day") return;
    setIsRangeLoading(true);
    const range =
      mode === "week"
        ? (() => {
            const dates = getWeekDates(date);
            return { start: dates[0], end: dates[6] };
          })()
        : getMonthRange(date);
    getWorkoutsForRange(range.start, range.end).then((result) => {
      if (result.success && result.data) setRangeData(result.data);
      setIsRangeLoading(false);
    });
  }, []);

  useEffect(() => {
    loadRangeData(viewMode, workoutDate);
  }, [viewMode, workoutDate, loadRangeData]);

  // Auto-open tracking mode when navigated from planner with ?section=
  useEffect(() => {
    if (isLoading || didScrollRef.current) return;
    const section = searchParams.get("section");
    if (!section) return;
    didScrollRef.current = true;
    if ((MUSCLE_GROUP_ORDER as readonly string[]).includes(section)) {
      setTrackingScope(section as MuscleGroup);
    }
  }, [isLoading, searchParams]);

  // Navigate prev/next for week and month views
  function shiftDate(delta: number) {
    const d = new Date(workoutDate + "T12:00:00");
    if (viewMode === "week") d.setDate(d.getDate() + delta * 7);
    else if (viewMode === "month") d.setMonth(d.getMonth() + delta);
    else d.setDate(d.getDate() + delta);
    setWorkoutDate(d.toISOString().split("T")[0]);
  }

  const sortedExercises = [...exercises].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    const groupOrder =
      MUSCLE_GROUP_ORDER.indexOf(a.muscleGroup) - MUSCLE_GROUP_ORDER.indexOf(b.muscleGroup);
    if (groupOrder !== 0) return groupOrder;
    return (a.userSortOrder || a.sortOrder) - (b.userSortOrder || b.sortOrder);
  });

  // Tracking mode back handler
  const handleTrackingBack = () => {
    if (fromPlannerRef.current) {
      router.push("/planner");
    } else {
      setTrackingScope(null);
    }
  };

  // Date label for the header
  function dateLabel(): string {
    const d = new Date(workoutDate + "T12:00:00");
    if (viewMode === "day") {
      return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    }
    if (viewMode === "week") {
      const dates = getWeekDates(workoutDate);
      const start = new Date(dates[0] + "T12:00:00");
      const end = new Date(dates[6] + "T12:00:00");
      return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    }
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }

  const VIEW_TABS: { label: string; value: ViewMode }[] = [
    { label: "Day", value: "day" },
    { label: "Week", value: "week" },
    { label: "Month", value: "month" },
  ];

  return (
    <div className="space-y-4">
      {/* Top bar: navigation + view tabs + Track All */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Prev / date label / Next */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => shiftDate(-1)}
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setWorkoutDate(todayISODate())}
            className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors min-w-[120px] text-center"
          >
            {dateLabel()}
          </button>
          <button
            onClick={() => shiftDate(1)}
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* View mode tabs */}
        <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
          {VIEW_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setViewMode(tab.value)}
              className={
                tab.value === viewMode
                  ? "px-3 py-1.5 text-xs font-semibold bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 transition-colors"
                  : "px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              }
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Track All (only in day view) */}
        {viewMode === "day" && (
          <button
            onClick={() => setTrackingScope("all")}
            disabled={isLoading}
            className="rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
          >
            Track All
          </button>
        )}
      </div>

      {/* Loading skeleton */}
      {isLoading && viewMode === "day" ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-zinc-200 dark:border-zinc-800 h-16 animate-pulse bg-zinc-100 dark:bg-zinc-800"
            />
          ))}
        </div>
      ) : viewMode === "day" ? (
        <WorkoutDayView
          exercises={sortedExercises}
          workoutData={workoutData}
          onTrack={(mg) => setTrackingScope(mg)}
        />
      ) : isRangeLoading ? (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 h-32 animate-pulse bg-zinc-100 dark:bg-zinc-800" />
      ) : viewMode === "week" ? (
        <div className="space-y-4">
          <WorkoutWeekView
            anchorDate={workoutDate}
            data={rangeData}
            selectedDate={workoutDate}
            onDateSelect={(date) => {
              setWorkoutDate(date);
              setViewMode("day");
            }}
          />
          {/* Show selected day detail below week */}
          <WorkoutDayView
            exercises={sortedExercises}
            workoutData={workoutData}
            onTrack={(mg) => setTrackingScope(mg)}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <WorkoutMonthView
            anchorDate={workoutDate}
            data={rangeData}
            selectedDate={workoutDate}
            onDateSelect={(date) => {
              setWorkoutDate(date);
              setViewMode("day");
            }}
          />
          {/* Show selected day detail below month */}
          <WorkoutDayView
            exercises={sortedExercises}
            workoutData={workoutData}
            onTrack={(mg) => setTrackingScope(mg)}
          />
        </div>
      )}

      {/* Tracking mode overlay */}
      {trackingScope !== null && (() => {
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
            date={workoutDate}
            initialCompletedIds={new Set(savedTodayIds)}
            scopeLabel={scopeLabel}
            workoutData={workoutData}
            onBack={handleTrackingBack}
            onExit={() => setTrackingScope(null)}
            onExerciseSaved={(exerciseId, sets) => {
              setWorkoutData((prev) => ({ ...prev, [exerciseId]: sets }));
              setSavedTodayIds((prev) => new Set(prev).add(exerciseId));
            }}
          />
        );
      })()}
    </div>
  );
}
