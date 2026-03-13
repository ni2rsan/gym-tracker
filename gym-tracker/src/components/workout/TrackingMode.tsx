"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { X, ArrowLeft, Plus, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { ExerciseIcon } from "./ExerciseIcon";
import { SetRow } from "./SetRow";
import { saveWorkout, deleteExerciseTracking } from "@/actions/workout";
import { setPreferredSets as savePreferredSets } from "@/actions/exercise";
import { MUSCLE_GROUP_LABELS } from "@/constants/exercises";
import type { ExerciseWithSettings, SetData, MuscleGroup } from "@/types";

// ── Types ──────────────────────────────────────────────────────────────────

type TrackingView =
  | { kind: "icons" }
  | { kind: "exercise"; exercise: ExerciseWithSettings };

interface TrackingModeProps {
  exercises: ExerciseWithSettings[];
  date: string;
  initialCompletedIds: Set<string>;
  scopeLabel: string;
  workoutData?: Record<string, SetData[]>;
  onExit: () => void;
  onBack: () => void;
  onExerciseSaved: (exerciseId: string, sets: SetData[]) => void;
}

// ── Constants ──────────────────────────────────────────────────────────────

const GROUP_COLORS: Record<MuscleGroup, string> = {
  UPPER_BODY: "text-blue-600 dark:text-blue-400",
  LOWER_BODY: "text-amber-600 dark:text-amber-400",
  BODYWEIGHT: "text-purple-600 dark:text-purple-400",
  CARDIO: "text-rose-600 dark:text-rose-400",
};

const BREAK_OPTIONS = [
  { label: "1:30", seconds: 90 },
  { label: "2:00", seconds: 120 },
  { label: "2:30", seconds: 150 },
  { label: "3:00", seconds: 180 },
  { label: "3:30", seconds: 210 },
  { label: "4:00", seconds: 240 },
  { label: "4:30", seconds: 270 },
  { label: "5:00", seconds: 300 },
];

function formatTimer(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function defaultSetCount(ex: ExerciseWithSettings): number {
  return ex.isBodyweight || ex.muscleGroup === "CARDIO" ? 1 : 3;
}

function makeEmptySets(ex: ExerciseWithSettings, count?: number): SetData[] {
  const n = count ?? ex.preferredSets ?? defaultSetCount(ex);
  return Array.from({ length: n }, (_, i) => ({
    setNumber: i + 1,
    reps: 0,
    weightKg: "",
  }));
}

// ── Component ──────────────────────────────────────────────────────────────

export function TrackingMode({
  exercises,
  date,
  initialCompletedIds,
  scopeLabel,
  workoutData,
  onExit,
  onBack,
  onExerciseSaved,
}: TrackingModeProps) {
  const [view, setView] = useState<TrackingView>({ kind: "icons" });
  const [completedIds, setCompletedIds] = useState<Set<string>>(initialCompletedIds);
  const [sets, setSets] = useState<SetData[]>([]);
  const [initialSets, setInitialSets] = useState<SetData[]>([]);
  const [sessionSavedSets, setSessionSavedSets] = useState<Record<string, SetData[]>>({});
  const [isPending, startTransition] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showDiscardWarning, setShowDiscardWarning] = useState(false);

  // Automated tracking
  const [autoTrack, setAutoTrack] = useState(false);
  const [breakDuration, setBreakDuration] = useState(120);

  // Automated exercise detail state
  const [activeSetIdx, setActiveSetIdx] = useState(0);
  const [completedSetFlags, setCompletedSetFlags] = useState<boolean[]>([]);
  const [timerSetIdx, setTimerSetIdx] = useState<number | null>(null);
  const [timerLeft, setTimerLeft] = useState(0);

  // Summary overlay (automated mode — tap a done icon)
  const [summaryOverlay, setSummaryOverlay] = useState<ExerciseWithSettings | null>(null);

  const hasNonCardio = exercises.some((ex) => ex.muscleGroup !== "CARDIO");

  // ── Wake Lock ────────────────────────────────────────────────────────────
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  useEffect(() => {
    if (!autoTrack) {
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
      return;
    }
    if ("wakeLock" in navigator) {
      navigator.wakeLock.request("screen").then((lock) => {
        wakeLockRef.current = lock;
      }).catch(() => {});
    }
    return () => {
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
    };
  }, [autoTrack]);

  // ── Timer effect ────────────────────────────────────────────────────────
  useEffect(() => {
    if (timerSetIdx === null || timerLeft <= 0) return;
    const id = setInterval(() => setTimerLeft((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timerSetIdx, timerLeft]);

  // When timer hits 0, advance to next set (or auto-save if last)
  useEffect(() => {
    if (timerSetIdx === null || timerLeft > 0) return;
    if (view.kind !== "exercise") return;
    const ex = view.exercise;
    const isLast = timerSetIdx === sets.length - 1;
    setTimerSetIdx(null);
    if (isLast) {
      handleAutoSave(ex);
    } else {
      setActiveSetIdx(timerSetIdx + 1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerLeft, timerSetIdx]);

  // ── Helpers ─────────────────────────────────────────────────────────────

  const openExercise = (ex: ExerciseWithSettings) => {
    const prefill =
      sessionSavedSets[ex.id] ??
      workoutData?.[ex.id] ??
      makeEmptySets(ex);
    const snapshot = prefill.map((s) => ({ ...s }));
    setSets(snapshot);
    setInitialSets(snapshot);
    setSaveError(null);
    setShowDiscardWarning(false);
    // Reset automated state
    setActiveSetIdx(0);
    setCompletedSetFlags(Array(snapshot.length).fill(false));
    setTimerSetIdx(null);
    setTimerLeft(0);
    setView({ kind: "exercise", exercise: ex });
  };

  const handleIconClick = (ex: ExerciseWithSettings) => {
    const done = completedIds.has(ex.id);
    if (done) {
      setSummaryOverlay(ex);
      return;
    }
    openExercise(ex);
  };

  const handleSave = (ex: ExerciseWithSettings) => {
    startTransition(async () => {
      const result = await saveWorkout({ date, exercises: [{ exerciseId: ex.id, sets }] });
      if (result.success) {
        setCompletedIds((prev) => new Set(prev).add(ex.id));
        setSessionSavedSets((prev) => ({ ...prev, [ex.id]: sets }));
        onExerciseSaved(ex.id, sets);
        setView({ kind: "icons" });
      } else {
        setSaveError(result.error ?? "Failed to save");
      }
    });
  };

  const handleAutoSave = (ex: ExerciseWithSettings) => {
    startTransition(async () => {
      const result = await saveWorkout({ date, exercises: [{ exerciseId: ex.id, sets }] });
      if (result.success) {
        setCompletedIds((prev) => new Set(prev).add(ex.id));
        setSessionSavedSets((prev) => ({ ...prev, [ex.id]: sets }));
        onExerciseSaved(ex.id, sets);
        setView({ kind: "icons" });
      } else {
        setSaveError(result.error ?? "Failed to save");
      }
    });
  };

  const handleBackArrow = () => {
    const isDirty = JSON.stringify(sets) !== JSON.stringify(initialSets);
    if (!autoTrack && isDirty) {
      setShowDiscardWarning(true);
      return;
    }
    setView({ kind: "icons" });
  };

  const handleSetDone = (ex: ExerciseWithSettings, idx: number) => {
    const newFlags = [...completedSetFlags];
    newFlags[idx] = true;
    setCompletedSetFlags(newFlags);
    const isLast = idx === sets.length - 1;
    if (isLast) {
      handleAutoSave(ex);
    } else {
      setTimerSetIdx(idx);
      setTimerLeft(breakDuration);
    }
  };

  const handleSkipTimer = (idx: number, ex: ExerciseWithSettings) => {
    setTimerSetIdx(null);
    setTimerLeft(0);
    const isLast = idx === sets.length - 1;
    if (isLast) {
      handleAutoSave(ex);
    } else {
      setActiveSetIdx(idx + 1);
    }
  };

  // ── Icons view ─────────────────────────────────────────────────────────
  if (view.kind === "icons") {
    const allDone = exercises.length > 0 && exercises.every((ex) => completedIds.has(ex.id));

    return (
      <div className="fixed inset-0 z-[60] bg-white dark:bg-zinc-950 overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="text-center">
            <p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wide font-medium">Tracking Mode</p>
            <p className="text-sm font-semibold text-zinc-900 dark:text-white">{scopeLabel}</p>
          </div>
          <button
            onClick={onExit}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="h-4 w-4" />
            Exit
          </button>
        </div>

        {/* Automated Tracking controls */}
        {hasNonCardio && (
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 shrink-0">Automated Tracking</span>
            {/* Toggle */}
            <button
              onClick={() => setAutoTrack((v) => !v)}
              className={cn(
                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors",
                autoTrack ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-600"
              )}
              role="switch"
              aria-checked={autoTrack}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 rounded-full bg-white shadow transition-transform",
                  autoTrack ? "translate-x-4" : "translate-x-0.5"
                )}
              />
            </button>

            <span className="text-xs text-zinc-400 dark:text-zinc-500 shrink-0 ml-auto">Break</span>
            <select
              value={breakDuration}
              onChange={(e) => setBreakDuration(Number(e.target.value))}
              disabled={!autoTrack}
              className="text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1 text-zinc-700 dark:text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {BREAK_OPTIONS.map((o) => (
                <option key={o.seconds} value={o.seconds}>{o.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* All done banner */}
        {allDone && (
          <div className="mx-4 mt-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-4 py-3 text-center">
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">All exercises tracked!</p>
            <button
              onClick={onExit}
              className="mt-1 text-xs text-emerald-600 dark:text-emerald-500 underline underline-offset-2"
            >
              Exit tracking mode
            </button>
          </div>
        )}

        {/* Icon grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-x-4 gap-y-6 p-5">
          {exercises.map((ex) => {
            const done = completedIds.has(ex.id);
            return (
              <button
                key={ex.id}
                onClick={() => handleIconClick(ex)}
                className="flex flex-col items-center gap-2 text-center active:scale-95 transition-transform"
              >
                <div
                  className={cn(
                    "relative w-16 h-16 rounded-full flex items-center justify-center transition-colors",
                    done
                      ? "bg-amber-100 dark:bg-amber-900/50"
                      : "bg-zinc-100 dark:bg-zinc-800 ring-2 ring-zinc-200 dark:ring-zinc-700 active:ring-zinc-300 dark:active:ring-zinc-600"
                  )}
                >
                  <ExerciseIcon name={ex.name} muscleGroup={ex.muscleGroup} className="h-7 w-7 sm:h-8 sm:w-8" />
                  {done && (
                    <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-950 flex items-center justify-center">
                      <span className="text-white font-bold leading-none" style={{ fontSize: "9px" }}>✓</span>
                    </span>
                  )}
                </div>
                <span
                  className={cn(
                    "text-[11px] font-medium leading-tight line-clamp-2 w-full",
                    done ? "text-amber-700 dark:text-amber-400" : "text-zinc-600 dark:text-zinc-400"
                  )}
                >
                  {ex.name.charAt(0) + ex.name.slice(1).toLowerCase()}
                </span>
              </button>
            );
          })}
        </div>

        {/* Finish button */}
        <div className="px-5 pb-8">
          <button
            onClick={onExit}
            className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-600 py-3 text-sm font-bold text-white transition-colors"
          >
            Finish
          </button>
        </div>

        {/* Summary overlay (automated mode — tap done icon) */}
        {summaryOverlay && (() => {
          const savedSets = sessionSavedSets[summaryOverlay.id] ?? workoutData?.[summaryOverlay.id] ?? [];
          const isCardio = summaryOverlay.muscleGroup === "CARDIO";
          return (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40">
              <div className="w-full max-w-xs rounded-2xl bg-white dark:bg-zinc-900 shadow-xl overflow-hidden">
                {/* Overlay header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <ExerciseIcon name={summaryOverlay.name} muscleGroup={summaryOverlay.muscleGroup} className="h-5 w-5" />
                    <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                      {summaryOverlay.name.charAt(0) + summaryOverlay.name.slice(1).toLowerCase()}
                    </span>
                  </div>
                  <button onClick={() => setSummaryOverlay(null)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {/* Set list */}
                <div className="px-4 py-3 space-y-1.5">
                  {savedSets.length === 0 ? (
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center py-2">No data recorded</p>
                  ) : (
                    savedSets.map((s) => (
                      <div key={s.setNumber} className="flex items-center gap-2 text-sm">
                        <span className="w-8 text-xs text-zinc-400 dark:text-zinc-500 font-medium shrink-0">S{s.setNumber}</span>
                        <span className="text-zinc-700 dark:text-zinc-300">
                          {isCardio
                            ? `${s.reps || 0} min`
                            : summaryOverlay.isBodyweight
                              ? `${s.reps || 0} reps`
                              : `${s.reps || 0} reps · ${s.weightKg || 0} kg`}
                        </span>
                      </div>
                    ))
                  )}
                </div>
                {/* Overlay footer */}
                <div className="px-4 pb-4 flex gap-2">
                  <button
                    onClick={() => {
                      const exId = summaryOverlay.id;
                      setCompletedIds((prev) => {
                        const next = new Set(prev);
                        next.delete(exId);
                        return next;
                      });
                      setSessionSavedSets((prev) => {
                        const next = { ...prev };
                        delete next[exId];
                        return next;
                      });
                      setSummaryOverlay(null);
                      startTransition(async () => {
                        await deleteExerciseTracking(exId, date);
                      });
                    }}
                    className="flex-1 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 py-2.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors"
                  >
                    Delete Tracking
                  </button>
                  <button
                    onClick={() => {
                      const ex = summaryOverlay;
                      setSummaryOverlay(null);
                      openExercise(ex);
                    }}
                    className="flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-600 py-2.5 text-xs font-semibold text-white transition-colors"
                  >
                    Re-track
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    );
  }

  // ── Exercise detail view ─────────────────────────────────────────────────
  const ex = view.exercise;
  const isCardio = ex.muscleGroup === "CARDIO";
  const isDirty = JSON.stringify(sets) !== JSON.stringify(initialSets);

  return (
    <div className="fixed inset-0 z-[60] bg-white dark:bg-zinc-950 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <button
          onClick={handleBackArrow}
          className="flex items-center justify-center w-8 h-8 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wide font-medium">
            {MUSCLE_GROUP_LABELS[ex.muscleGroup]}
          </p>
          <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
            {ex.name.charAt(0) + ex.name.slice(1).toLowerCase()}
          </p>
        </div>
        <button
          onClick={onExit}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Automated toggle (non-cardio only) */}
      {!isCardio && hasNonCardio && (
        <div className="flex items-center gap-3 px-4 py-2 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Automated</span>
          <button
            onClick={() => setAutoTrack((v) => !v)}
            className={cn(
              "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors",
              autoTrack ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-600"
            )}
            role="switch"
            aria-checked={autoTrack}
          >
            <span className={cn("inline-block h-4 w-4 rounded-full bg-white shadow transition-transform", autoTrack ? "translate-x-4" : "translate-x-0.5")} />
          </button>
          {autoTrack && (
            <>
              <span className="text-xs text-zinc-400 dark:text-zinc-500 ml-auto">Break</span>
              <select
                value={breakDuration}
                onChange={(e) => setBreakDuration(Number(e.target.value))}
                className="text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {BREAK_OPTIONS.map((o) => (
                  <option key={o.seconds} value={o.seconds}>{o.label}</option>
                ))}
              </select>
            </>
          )}
        </div>
      )}

      {/* Discard warning */}
      {showDiscardWarning && (
        <div className="mx-4 mt-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-4 py-3 flex items-center gap-3">
          <p className="flex-1 text-xs text-amber-700 dark:text-amber-300 font-medium">Unsaved edits — go back anyway?</p>
          <button
            onClick={() => setView({ kind: "icons" })}
            className="rounded-lg bg-amber-100 dark:bg-amber-900/40 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/60 transition-colors"
          >
            Discard
          </button>
          <button
            onClick={() => setShowDiscardWarning(false)}
            className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            Keep Editing
          </button>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center gap-6">
        {/* Large icon */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-24 h-24 rounded-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 ring-2 ring-zinc-200 dark:ring-zinc-700">
            <ExerciseIcon name={ex.name} muscleGroup={ex.muscleGroup} className="h-12 w-12" />
          </div>
          <span className={cn("text-xs font-semibold uppercase tracking-wide", GROUP_COLORS[ex.muscleGroup])}>
            {MUSCLE_GROUP_LABELS[ex.muscleGroup]}
          </span>
        </div>

        {/* Set inputs */}
        <div className="w-full max-w-sm space-y-2">
          {isCardio ? (
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">Duration</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={999}
                value={sets[0]?.reps === 0 ? "" : sets[0]?.reps}
                placeholder="min"
                onChange={(e) => {
                  const mins = e.target.value === "" ? 0 : parseInt(e.target.value, 10) || 0;
                  setSets([{ setNumber: 1, reps: mins, weightKg: "" }]);
                }}
                className="h-14 w-32 rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-center text-2xl font-semibold text-zinc-900 placeholder-zinc-300 focus:border-rose-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-rose-500 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-white dark:placeholder-zinc-600 dark:focus:border-rose-400 dark:focus:bg-zinc-800 dark:focus:ring-rose-400 transition-colors"
              />
              <span className="text-xs text-zinc-400 dark:text-zinc-500">minutes</span>
            </div>
          ) : (
            <>
              {sets.length > 0 && !autoTrack && (
                <div className="flex items-center gap-1.5 mb-1.5 text-xs text-zinc-400 dark:text-zinc-500">
                  <span className="w-10 shrink-0 text-center">Set</span>
                  <span className="flex-1 text-center">Reps</span>
                  {!ex.isBodyweight && <span className="flex-1 text-center">kg</span>}
                </div>
              )}
              {sets.length > 0 && autoTrack && (
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-10 shrink-0" />
                  <div className="flex-1 flex items-center gap-1.5">
                    <span className="flex-1 text-center text-xs font-medium text-zinc-400 dark:text-zinc-500">Reps</span>
                    {!ex.isBodyweight && (
                      <span className="flex-1 text-center text-xs font-medium text-zinc-400 dark:text-zinc-500">kg</span>
                    )}
                  </div>
                  <span className="w-16 shrink-0" />
                </div>
              )}

              {sets.map((set, i) => {
                const isActive = autoTrack && i === activeSetIdx && !completedSetFlags[i];
                const isTimerRow = autoTrack && timerSetIdx === i;
                const isDoneRow = autoTrack && completedSetFlags[i] && timerSetIdx !== i;
                const isPendingRow = autoTrack && i > activeSetIdx && !completedSetFlags[i];
                const rowDisabled = autoTrack && !isActive;

                if (!autoTrack) {
                  return (
                    <SetRow
                      key={set.setNumber}
                      setNumber={set.setNumber}
                      data={set}
                      isBodyweight={ex.isBodyweight}
                      onChange={(updated) => setSets((prev) => prev.map((s, idx) => (idx === i ? updated : s)))}
                    />
                  );
                }

                return (
                  <div
                    key={set.setNumber}
                    className={cn(
                      "rounded-lg transition-all",
                      isActive && "ring-2 ring-emerald-400 dark:ring-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-1",
                      isTimerRow && "px-2 py-1",
                      isPendingRow && "opacity-40",
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      {isActive ? (
                        <button
                          onClick={() => handleSetDone(ex, i)}
                          className="w-10 shrink-0 rounded-md bg-emerald-500 hover:bg-emerald-600 py-1 text-[10px] font-bold text-white transition-colors text-center"
                        >
                          Done
                        </button>
                      ) : isDoneRow || isTimerRow ? (
                        <span className="w-10 shrink-0 text-center text-emerald-500 font-bold text-sm">✓</span>
                      ) : (
                        <span className="w-10 shrink-0 text-center text-xs font-medium text-zinc-400 dark:text-zinc-500">
                          S{set.setNumber}
                        </span>
                      )}

                      <div className={cn("flex items-center gap-1.5 flex-1", rowDisabled && "pointer-events-none")}>
                        <div className="flex-1 min-w-0">
                            <input
                              type="number"
                              inputMode="numeric"
                              min={0}
                              max={9999}
                              value={set.reps === 0 ? "" : set.reps}
                              placeholder="reps"
                              disabled={rowDisabled}
                              onChange={(e) =>
                                setSets((prev) =>
                                  prev.map((s, idx) =>
                                    idx === i ? { ...s, reps: e.target.value === "" ? 0 : parseInt(e.target.value, 10) || 0 } : s
                                  )
                                )
                              }
                              className="h-9 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2 text-center text-sm text-zinc-900 placeholder-zinc-300 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-white dark:placeholder-zinc-600 dark:focus:border-emerald-400 dark:focus:bg-zinc-800 dark:focus:ring-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                          </div>
                          {!ex.isBodyweight && (
                            <div className="flex-1 min-w-0">
                              <input
                                type="number"
                                inputMode="decimal"
                                min={0}
                                max={9999}
                                step={0.5}
                                value={set.weightKg === 0 || set.weightKg === "" ? "" : set.weightKg}
                                placeholder="kg"
                                disabled={rowDisabled}
                                onChange={(e) =>
                                  setSets((prev) =>
                                    prev.map((s, idx) =>
                                      idx === i
                                        ? { ...s, weightKg: e.target.value === "" ? "" : parseFloat(e.target.value) || 0 }
                                        : s
                                    )
                                  )
                                }
                                className="h-9 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2 text-center text-sm text-zinc-900 placeholder-zinc-300 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-white dark:placeholder-zinc-600 dark:focus:border-emerald-400 dark:focus:bg-zinc-800 dark:focus:ring-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              />
                            </div>
                          )}
                        </div>

                      {isTimerRow && (
                        <div className="flex items-center gap-1.5 w-16 shrink-0">
                          <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
                            {formatTimer(timerLeft)}
                          </span>
                          <button
                            onClick={() => handleSkipTimer(i, ex)}
                            className="text-[10px] text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 underline underline-offset-1"
                          >
                            Skip
                          </button>
                        </div>
                      )}
                      {!isTimerRow && (
                        <span className="w-16 shrink-0" />
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Add / Remove set */}
              <div className="flex items-center gap-1.5 pt-1">
                <button
                  onClick={() => {
                    if (sets.length <= 1) return;
                    setSets((prev) => prev.slice(0, -1));
                    setCompletedSetFlags((prev) => prev.slice(0, -1));
                  }}
                  disabled={sets.length <= 1}
                  className="flex items-center gap-0.5 rounded-md border border-zinc-200 dark:border-zinc-700 px-2 py-1 text-[11px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Minus className="h-2.5 w-2.5" /> Set
                </button>
                <button
                  onClick={() => {
                    setSets((prev) => [...prev, { setNumber: prev.length + 1, reps: 0, weightKg: "" }]);
                    setCompletedSetFlags((prev) => [...prev, false]);
                    startTransition(async () => { await savePreferredSets(ex.id, sets.length + 1); });
                  }}
                  className="flex items-center gap-0.5 rounded-md border border-zinc-200 dark:border-zinc-700 px-2 py-1 text-[11px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  <Plus className="h-2.5 w-2.5" /> Set
                </button>
              </div>
            </>
          )}
        </div>

        {saveError && <p className="text-xs text-red-500">{saveError}</p>}
      </div>

      {/* Footer — Next button (normal mode only; automated mode saves per-set) */}
      {(!autoTrack || isCardio) && (
        <div
          className="px-4 pt-4 border-t border-zinc-200 dark:border-zinc-800"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <button
            onClick={() => handleSave(ex)}
            disabled={isPending}
            className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 py-3 text-sm font-bold text-white transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
