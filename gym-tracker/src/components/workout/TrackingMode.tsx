"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { X, ArrowLeft, Plus, Minus, Eye, EyeOff, TrendingUp, TrendingDown, ChevronDown, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ExerciseIcon } from "./ExerciseIcon";
import { SetRow } from "./SetRow";
import { saveWorkout, deleteExerciseTracking, getExerciseComparisonData, getExercisesComparisonBatch } from "@/actions/workout";
import { awardSessionStardust } from "@/actions/garden";
import { WorkoutSummaryModal } from "./WorkoutSummaryModal";
import type { SummaryExerciseData } from "./WorkoutSummaryModal";
import { setPreferredSets as savePreferredSets } from "@/actions/exercise";
import { MUSCLE_GROUP_LABELS } from "@/constants/exercises";
import { computeSetDiffs, computeOutcome, isAssistedExercise } from "@/lib/workoutDiff";
import type { PrevSet } from "@/lib/workoutDiff";
import type { ExerciseWithSettings, SetData, MuscleGroup } from "@/types";
import { GuideModal } from "@/components/guide/GuideModal";
import { trackingIconSteps, trackingExerciseSteps } from "@/components/guide/trackingSteps";
import { GuideButton } from "@/components/guide/GuideButton";

// ── Types ──────────────────────────────────────────────────────────────────

type TrackingView =
  | { kind: "icons" }
  | { kind: "exercise"; exercise: ExerciseWithSettings };

interface TrackingModeSection {
  label: string;
  exercises: ExerciseWithSettings[];
}

interface TrackingModeProps {
  exercises: ExerciseWithSettings[];
  date: string;
  initialCompletedIds: Set<string>;
  scopeLabel: string;
  sections?: TrackingModeSection[];
  workoutData?: Record<string, SetData[]>;
  skippedIds?: Set<string>;
  onSkipChange?: (id: string, skipped: boolean) => void;
  /** Outcomes computed by WorkoutForm (bulk-save path) — merged with in-session outcomes */
  externalOutcomes?: Record<string, { allPositive: boolean; allNegative: boolean; isPR: boolean }>;
  /** Called when the user presses "Finish" on a FIRST visit — parent shows summary overlay after closing */
  onFinish: () => void;
  onExit: () => void;
  onBack: () => void;
  onExerciseSaved: (exerciseId: string, sets: SetData[]) => void;
  onExerciseOutcome?: (
    exerciseId: string,
    outcome: { allPositive: boolean; allNegative: boolean; isPR: boolean },
    prevSets: PrevSet[],
    currentSets: SetData[]
  ) => void;
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
  sections,
  workoutData,
  skippedIds = new Set(),
  onSkipChange,
  externalOutcomes,
  onFinish,
  onExit,
  onBack,
  onExerciseSaved,
  onExerciseOutcome,
}: TrackingModeProps) {
  // Capture revisit state at mount — NOT on every render.
  // initialCompletedIds prop updates as exercises are saved mid-session,
  // which would incorrectly flip isRevisit from false → true after the first save.
  const isRevisitRef = useRef(initialCompletedIds.size > 0);
  const isRevisit = isRevisitRef.current;
  const [view, setView] = useState<TrackingView>({ kind: "icons" });
  const [completedIds, setCompletedIds] = useState<Set<string>>(initialCompletedIds);
  const [sets, setSets] = useState<SetData[]>([]);
  const [initialSets, setInitialSets] = useState<SetData[]>([]);
  const [sessionSavedSets, setSessionSavedSets] = useState<Record<string, SetData[]>>({});
  const [isPending, startTransition] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showDiscardWarning, setShowDiscardWarning] = useState(false);
  const [showSavePartialWarning, setShowSavePartialWarning] = useState(false);

  // Automated tracking
  const [autoTrack, setAutoTrack] = useState(false);
  const [breakDuration, setBreakDuration] = useState(120);

  // Automated exercise detail state
  const [activeSetIdx, setActiveSetIdx] = useState(0);
  const [completedSetFlags, setCompletedSetFlags] = useState<boolean[]>([]);
  const [timerSetIdx, setTimerSetIdx] = useState<number | null>(null);
  const [timerLeft, setTimerLeft] = useState(0);
  // Absolute end-timestamp so the timer survives phone lock / tab background
  const timerEndAtRef = useRef<number | null>(null);

  // Manual mode edit toggle
  const [isManualEditMode, setIsManualEditMode] = useState(false);

  // Large timer minimized state — reset each time a new timer starts
  const [timerMinimized, setTimerMinimized] = useState(false);

  // Summary overlay (automated mode — tap a done icon)
  const [summaryOverlay, setSummaryOverlay] = useState<ExerciseWithSettings | null>(null);

  // Comparison overlay (shown after each save)
  const [comparisonOverlay, setComparisonOverlay] = useState<{
    exercise: ExerciseWithSettings;
    prevSets: PrevSet[];
    currentSets: SetData[];
    isPR: boolean;
  } | null>(null);

  // Per-exercise outcome badges
  const [exerciseOutcomes, setExerciseOutcomes] = useState<
    Record<string, { allPositive: boolean; allNegative: boolean; isPR: boolean }>
  >({});

  // Per-exercise prevSets + currentSets for detailed summary
  const [comparisonDetails, setComparisonDetails] = useState<
    Record<string, { prevSets: PrevSet[]; currentSets: SetData[]; isPR: boolean }>
  >({});

  // Stardust tracking
  const [stardustEarned, setStardustEarned] = useState(0);
  const awardedExerciseIdsRef = useRef<Set<string>>(new Set());

  // Detailed "View Summary" modal (dismissable, doesn't exit)
  const [showDetailedSummary, setShowDetailedSummary] = useState(false);

  // Guide modals (shown once ever per context)
  const [showIconGuide, setShowIconGuide] = useState(false);
  const [iconGuideStep, setIconGuideStep] = useState(0);
  const [showExerciseGuide, setShowExerciseGuide] = useState(false);
  const [exerciseGuideStep, setExerciseGuideStep] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem("gymtracker_guide_seen_tracking_icons")) {
      setShowIconGuide(true);
    }
  }, []);

  // On mount: hydrate outcomes + details for exercises already completed (e.g. returning to icon page)
  useEffect(() => {
    const completedExercises = exercises.filter((ex) => initialCompletedIds.has(ex.id));
    if (!completedExercises.length) return;
    const batchInput = completedExercises.map((ex) => ({
      id: ex.id,
      isBodyweight: ex.isBodyweight,
      isAssisted: isAssistedExercise(ex.name),
    }));
    getExercisesComparisonBatch(batchInput, date).then((result) => {
      if (!result.success || !result.data) return;
      const newOutcomes: Record<string, { allPositive: boolean; allNegative: boolean; isPR: boolean }> = {};
      const newDetails: Record<string, { prevSets: PrevSet[]; currentSets: SetData[]; isPR: boolean }> = {};
      for (const ex of completedExercises) {
        const comp = result.data[ex.id];
        if (!comp) continue;
        const { prevSets, isPR } = comp;
        const currentSets = workoutData?.[ex.id] ?? [];
        const diffs = computeSetDiffs(prevSets, currentSets);
        const { allPositive, allNegative } = computeOutcome(diffs, ex.isBodyweight);
        newOutcomes[ex.id] = { allPositive, allNegative, isPR };
        newDetails[ex.id] = { prevSets, currentSets, isPR };
      }
      setExerciseOutcomes((prev) => ({ ...prev, ...newOutcomes }));
      setComparisonDetails((prev) => ({ ...prev, ...newDetails }));
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const hasNonCardio = exercises.some((ex) => ex.muscleGroup !== "CARDIO");
  const nonSkippedExercises = exercises.filter((ex) => !skippedIds.has(ex.id));

  // Long-press timer ref for skip gesture
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  // Uses an absolute end-timestamp so the countdown survives phone lock /
  // tab backgrounding. The interval just refreshes the display; actual
  // remaining time is always computed from wall-clock.
  useEffect(() => {
    if (timerSetIdx === null || timerEndAtRef.current === null) return;

    function tick() {
      const remaining = Math.max(0, Math.round((timerEndAtRef.current! - Date.now()) / 1000));
      setTimerLeft(remaining);
    }

    tick(); // immediate update (handles waking up from lock)
    const id = setInterval(tick, 500); // 500ms so display stays snappy
    return () => clearInterval(id);
  }, [timerSetIdx]);

  // Recalculate immediately when screen wakes up / tab becomes visible
  useEffect(() => {
    function onVisible() {
      if (timerSetIdx === null || timerEndAtRef.current === null) return;
      const remaining = Math.max(0, Math.round((timerEndAtRef.current - Date.now()) / 1000));
      setTimerLeft(remaining);
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [timerSetIdx]);

  // When timer hits 0, advance to next set (or auto-save if last)
  useEffect(() => {
    if (timerSetIdx === null || timerLeft > 0) return;
    if (view.kind !== "exercise") return;
    const ex = view.exercise;
    const isLast = timerSetIdx === sets.length - 1;
    setTimerSetIdx(null);
    timerEndAtRef.current = null;
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
    setShowSavePartialWarning(false);
    // Reset automated state
    setActiveSetIdx(0);
    setCompletedSetFlags(Array(snapshot.length).fill(false));
    setTimerSetIdx(null);
    timerEndAtRef.current = null;
    setTimerLeft(0);
    setIsManualEditMode(true);
    setView({ kind: "exercise", exercise: ex });
    // Show exercise guide once ever
    if (!localStorage.getItem("gymtracker_guide_seen_tracking_exercise")) {
      setShowExerciseGuide(true);
    }
  };

  const handleIconClick = (ex: ExerciseWithSettings) => {
    const done = completedIds.has(ex.id);
    if (done) {
      setSummaryOverlay(ex);
      return;
    }
    openExercise(ex);
  };

  const afterSaveComparison = async (ex: ExerciseWithSettings, savedSets: SetData[]) => {
    const assisted = isAssistedExercise(ex.name);
    const compResult = await getExerciseComparisonData(ex.id, date, ex.isBodyweight, assisted);
    if (compResult.success && compResult.data) {
      const { prevSets, isPR } = compResult.data;
      const diffs = computeSetDiffs(prevSets, savedSets);
      const { allPositive, allNegative } = computeOutcome(diffs, ex.isBodyweight);
      setExerciseOutcomes((prev) => ({ ...prev, [ex.id]: { allPositive, allNegative, isPR } }));
      setComparisonDetails((prev) => ({ ...prev, [ex.id]: { prevSets, currentSets: savedSets, isPR } }));
      onExerciseOutcome?.(ex.id, { allPositive, allNegative, isPR }, prevSets, savedSets);
      // Award stardust for positive outcomes
      if (allPositive && !awardedExerciseIdsRef.current.has(ex.id)) {
        awardedExerciseIdsRef.current.add(ex.id);
        setStardustEarned((prev) => prev + 1);
        awardSessionStardust(1).catch(() => {});
      }
      setComparisonOverlay({ exercise: ex, prevSets, currentSets: savedSets, isPR });
      setView({ kind: "icons" });
    } else {
      setView({ kind: "icons" });
    }
  };

  const handleSave = (ex: ExerciseWithSettings) => {
    startTransition(async () => {
      const result = await saveWorkout({ date, exercises: [{ exerciseId: ex.id, sets }] });
      if (result.success) {
        const savedSets = [...sets];
        setCompletedIds((prev) => new Set(prev).add(ex.id));
        setSessionSavedSets((prev) => ({ ...prev, [ex.id]: savedSets }));
        onExerciseSaved(ex.id, savedSets);
        await afterSaveComparison(ex, savedSets);
      } else {
        setSaveError(result.error ?? "Failed to save");
      }
    });
  };

  const handleAutoSave = (ex: ExerciseWithSettings) => {
    startTransition(async () => {
      const result = await saveWorkout({ date, exercises: [{ exerciseId: ex.id, sets }] });
      if (result.success) {
        const savedSets = [...sets];
        setCompletedIds((prev) => new Set(prev).add(ex.id));
        setSessionSavedSets((prev) => ({ ...prev, [ex.id]: savedSets }));
        onExerciseSaved(ex.id, savedSets);
        await afterSaveComparison(ex, savedSets);
      } else {
        setSaveError(result.error ?? "Failed to save");
      }
    });
  };

  const handleBackArrow = () => {
    if (autoTrack && completedSetFlags.some(Boolean)) {
      setShowSavePartialWarning(true);
      return;
    }
    const isDirty = JSON.stringify(sets) !== JSON.stringify(initialSets);
    if (!autoTrack && isDirty) {
      setShowDiscardWarning(true);
      return;
    }
    setView({ kind: "icons" });
  };

  const handleSavePartialSets = (ex: ExerciseWithSettings) => {
    const completedSets = sets.filter((_, i) => completedSetFlags[i]);
    if (completedSets.length === 0) {
      setShowSavePartialWarning(false);
      setView({ kind: "icons" });
      return;
    }
    startTransition(async () => {
      const result = await saveWorkout({ date, exercises: [{ exerciseId: ex.id, sets: completedSets }] });
      if (result.success) {
        setCompletedIds((prev) => new Set(prev).add(ex.id));
        setSessionSavedSets((prev) => ({ ...prev, [ex.id]: completedSets }));
        onExerciseSaved(ex.id, completedSets);
        setShowSavePartialWarning(false);
        await afterSaveComparison(ex, completedSets);
      } else {
        setSaveError(result.error ?? "Failed to save");
        setShowSavePartialWarning(false);
      }
    });
  };

  const handleSetDone = (ex: ExerciseWithSettings, idx: number) => {
    const newFlags = [...completedSetFlags];
    newFlags[idx] = true;
    setCompletedSetFlags(newFlags);
    const isLast = idx === sets.length - 1;
    if (isLast) {
      handleAutoSave(ex);
    } else {
      setTimerMinimized(false); // always start large
      setTimerSetIdx(idx);
      timerEndAtRef.current = Date.now() + breakDuration * 1000;
      setTimerLeft(breakDuration);
    }
  };

  const handleSkipTimer = (idx: number, ex: ExerciseWithSettings) => {
    setTimerSetIdx(null);
    timerEndAtRef.current = null;
    setTimerLeft(0);
    const isLast = idx === sets.length - 1;
    if (isLast) {
      handleAutoSave(ex);
    } else {
      setActiveSetIdx(idx + 1);
    }
  };

  const handleUndoLastSet = () => {
    const lastIdx = completedSetFlags.lastIndexOf(true);
    if (lastIdx < 0) return;
    const newFlags = [...completedSetFlags];
    newFlags[lastIdx] = false;
    setCompletedSetFlags(newFlags);
    setTimerSetIdx(null);
    timerEndAtRef.current = null;
    setTimerLeft(0);
    setActiveSetIdx(lastIdx);
  };

  // ── Icon render helper ───────────────────────────────────────────────────
  const renderExerciseIcon = (ex: ExerciseWithSettings) => {
    const done = completedIds.has(ex.id);
    const skipped = skippedIds.has(ex.id);
    // Merge locally-computed outcomes with those pushed from WorkoutForm (bulk-save path)
    const outcome = exerciseOutcomes[ex.id] ?? externalOutcomes?.[ex.id];
    return (
      <div key={ex.id} className="flex flex-col items-center gap-2 text-center">
        <div className="relative">
          <button
            onClick={() => {
              if (skipped) { onSkipChange?.(ex.id, false); return; }
              handleIconClick(ex);
            }}
            className={cn(
              "w-20 h-20 rounded-full flex items-center justify-center transition-colors active:scale-95",
              skipped
                ? "bg-zinc-100 dark:bg-zinc-800 opacity-40"
                : done
                  ? "bg-amber-100 dark:bg-amber-900/50"
                  : "bg-zinc-100 dark:bg-zinc-800 ring-2 ring-zinc-200 dark:ring-zinc-700 active:ring-zinc-300 dark:active:ring-zinc-600"
            )}
          >
            <ExerciseIcon name={ex.name} muscleGroup={ex.muscleGroup} className="h-10 w-10 sm:h-11 sm:w-11" />
            {done && !skipped && (
              <span className="absolute -top-0.5 -left-0.5 w-5 h-5 rounded-full bg-amber-500 ring-2 ring-amber-300 flex items-center justify-center">
                <span className="text-white font-black leading-none" style={{ fontSize: "9px" }}>✓</span>
              </span>
            )}
            {done && !skipped && outcome?.isPR && (
              <span className="absolute -top-0.5 -right-0.5 leading-none" style={{ fontSize: "13px" }}>🏆</span>
            )}
            {done && !skipped && outcome?.allPositive && (
              <span className="absolute -bottom-1.5 -left-1">
                <TrendingUp className="h-4 w-4 text-emerald-500 drop-shadow-sm" strokeWidth={2.5} />
              </span>
            )}
            {done && !skipped && outcome?.allNegative && (
              <span className="absolute -bottom-1.5 -left-1">
                <TrendingDown className="h-4 w-4 text-red-500 drop-shadow-sm" strokeWidth={2.5} />
              </span>
            )}
          </button>
          <button
            onClick={() => onSkipChange?.(ex.id, !skipped)}
            className={cn(
              "absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border-2 border-white dark:border-zinc-950 transition-colors",
              skipped
                ? "bg-zinc-400 dark:bg-zinc-500 text-white"
                : "bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-300 dark:hover:bg-zinc-600"
            )}
            title={skipped ? "Un-skip" : "Skip today"}
          >
            {skipped ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </button>
        </div>
        <span
          className={cn(
            "text-[11px] font-semibold leading-tight line-clamp-2 w-full uppercase tracking-wide",
            skipped
              ? "text-zinc-400 dark:text-zinc-500"
              : done
                ? "text-amber-700 dark:text-amber-400"
                : "text-zinc-600 dark:text-zinc-400"
          )}
        >
          {ex.name}
        </span>
        {ex.isCompound && !skipped && (
          <span className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/30 px-1.5 py-px text-[8px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
            Compound
          </span>
        )}
      </div>
    );
  };

  // ── Icons view ─────────────────────────────────────────────────────────
  if (view.kind === "icons") {
    const allDone = nonSkippedExercises.length > 0 && nonSkippedExercises.every((ex) => completedIds.has(ex.id));

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
          <div className="flex items-center gap-1.5">
            <GuideButton />
            <button
              onClick={onExit}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="h-4 w-4" />
              Exit
            </button>
          </div>
        </div>

        {/* Automated Tracking controls */}
        {hasNonCardio && (
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 shrink-0">Live Track</span>
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

        {/* Icon grid — flat or sectioned */}
        {sections ? (
          sections.map((sec) => (
            <div key={sec.label}>
              <div className="px-5 pt-4 pb-1">
                <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">{sec.label}</p>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-x-4 gap-y-6 px-5 pb-4">
                {sec.exercises.map((ex) => renderExerciseIcon(ex))}
              </div>
            </div>
          ))
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-x-4 gap-y-6 p-5">
            {exercises.map((ex) => renderExerciseIcon(ex))}
          </div>
        )}

        {/* Bottom action buttons */}
        <div className="px-5 pb-8 flex flex-col gap-2">
          {isRevisit && (
            <button
              onClick={() => setShowDetailedSummary(true)}
              className="w-full rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 py-2.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300 transition-colors"
            >
              View Summary
            </button>
          )}
          <button
            onClick={isRevisit ? onExit : onFinish}
            className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-600 py-3 text-sm font-bold text-white transition-colors"
          >
            Finish
          </button>
        </div>

        {/* Icon grid guide — shown once on first visit */}
        <GuideModal
          open={showIconGuide}
          onClose={() => {
            setShowIconGuide(false);
            localStorage.setItem("gymtracker_guide_seen_tracking_icons", "1");
          }}
          steps={trackingIconSteps}
          currentStep={iconGuideStep}
          onStepChange={setIconGuideStep}
          zClass="z-[80]"
        />

        {/* Comparison overlay — shown after each exercise save */}
        {comparisonOverlay && (() => {
          const { exercise: cex, prevSets, currentSets, isPR } = comparisonOverlay;
          const diffs = computeSetDiffs(prevSets, currentSets);
          const { allPositive, allNegative } = computeOutcome(diffs, cex.isBodyweight);
          const isFirstTime = prevSets.length === 0;
          return (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40">
              <div className="w-full max-w-xs rounded-2xl bg-white dark:bg-zinc-900 shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
                  <div className="flex items-center gap-2">
                    <ExerciseIcon name={cex.name} muscleGroup={cex.muscleGroup} className="h-5 w-5" />
                    <div>
                      <p className="text-sm font-semibold text-zinc-900 dark:text-white leading-tight">
                        {cex.name.charAt(0) + cex.name.slice(1).toLowerCase()}
                      </p>
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">
                        {MUSCLE_GROUP_LABELS[cex.muscleGroup]}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setComparisonOverlay(null); setView({ kind: "icons" }); }}
                    className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {/* PR banner */}
                {isPR && (
                  <div className="mx-4 mt-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-3 py-2 text-center text-xs font-bold text-amber-700 dark:text-amber-400 shrink-0">
                    🏆 New Personal Record! 🏆
                  </div>
                )}
                {/* Set comparison table */}
                <div className="px-4 py-3 overflow-y-auto">
                  {isFirstTime ? (
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center py-2">First time tracking this exercise!</p>
                  ) : (
                    <>
                      <div className="grid grid-cols-4 gap-1 mb-1.5">
                        {["S#", "Prev", "Today", "Diff"].map((h) => (
                          <span key={h} className="text-[9px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide text-center">{h}</span>
                        ))}
                      </div>
                      <div className="space-y-1">
                        {diffs.map((d) => {
                          const prevLabel = d.isNewSet ? "—" :
                            cex.isBodyweight ? `${d.prevReps}r` :
                            `${d.prevReps}r · ${d.prevKg}kg`;
                          const currLabel = d.isDropped ? "—" :
                            cex.isBodyweight ? `${d.currReps}r` :
                            `${d.currReps}r · ${d.currKg}kg`;
                          const diffLabel = d.isNewSet ? (
                            <span className="text-zinc-400 text-[9px]">new</span>
                          ) : d.isDropped ? (
                            <span className="text-zinc-400 text-[9px]">—</span>
                          ) : (() => {
                            const fmt = (v: number) => parseFloat(v.toFixed(1));
                            const parts: string[] = [];
                            if (d.diffReps !== null && d.diffReps !== 0) parts.push(`${d.diffReps > 0 ? "▲+" : "▼"}${fmt(d.diffReps)}r`);
                            if (!cex.isBodyweight && d.diffKg !== null && d.diffKg !== 0) parts.push(`${d.diffKg > 0 ? "▲+" : "▼"}${fmt(d.diffKg)}kg`);
                            if (parts.length === 0) return <span className="text-zinc-300 dark:text-zinc-600 text-[9px]">=</span>;
                            const isPos = (d.diffReps ?? 0) >= 0 && (d.diffKg ?? 0) >= 0;
                            return <span className={`text-[9px] font-medium ${isPos ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>{parts.join(" ")}</span>;
                          })();
                          return (
                            <div key={d.setNumber} className={cn("grid grid-cols-4 gap-1 items-center", d.isDropped && "opacity-50")}>
                              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 text-center font-medium">S{d.setNumber}</span>
                              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 text-center">{prevLabel}</span>
                              <span className="text-[10px] text-zinc-800 dark:text-zinc-200 text-center font-medium">{currLabel}</span>
                              <span className="text-center">{diffLabel}</span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                  {!isFirstTime && allPositive && (
                    <p className="mt-3 text-xs text-emerald-600 dark:text-emerald-400 text-center font-medium">💪 Great work! You keep making progress</p>
                  )}
                  {!isFirstTime && allNegative && (
                    <p className="mt-3 text-xs text-red-500 dark:text-red-400 text-center font-medium">🔥 Hang in there! Keep fighting. You got this.</p>
                  )}
                </div>
                {/* Close */}
                <div className="px-4 pb-4 shrink-0">
                  <button
                    onClick={() => { setComparisonOverlay(null); setView({ kind: "icons" }); }}
                    className="w-full rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 py-2.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300 transition-colors"
                  >
                    Continue
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Detailed summary modal (View Summary button) */}
        {showDetailedSummary && (() => {
          const summaryExercises: SummaryExerciseData[] = exercises
            .filter((ex) => comparisonDetails[ex.id])
            .map((ex) => ({
              exerciseId: ex.id,
              name: ex.name,
              muscleGroup: ex.muscleGroup,
              isBodyweight: ex.isBodyweight,
              isPR: comparisonDetails[ex.id].isPR,
              prevSets: comparisonDetails[ex.id].prevSets,
              currentSets: comparisonDetails[ex.id].currentSets,
            }));
          return (
            <WorkoutSummaryModal
              title="Session Summary"
              exercises={summaryExercises}
              onClose={() => setShowDetailedSummary(false)}
              stardustEarned={stardustEarned}
            />
          );
        })()}

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
      {/* Exercise detail guide — shown once ever across all exercises */}
      <GuideModal
        open={showExerciseGuide}
        onClose={() => {
          setShowExerciseGuide(false);
          localStorage.setItem("gymtracker_guide_seen_tracking_exercise", "1");
        }}
        steps={trackingExerciseSteps}
        currentStep={exerciseGuideStep}
        onStepChange={setExerciseGuideStep}
        zClass="z-[80]"
      />
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
        <div className="flex items-center gap-1">
          <GuideButton />
          <button
            onClick={onExit}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Automated toggle (non-cardio only) */}
      {!isCardio && hasNonCardio && (
        <div className="flex items-center gap-3 px-4 py-2 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Live Track</span>
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

      {/* Save partial sets prompt (Live Track mode) */}
      {showSavePartialWarning && (
        <div className="mx-4 mt-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 px-4 py-3 flex items-center gap-3">
          <p className="flex-1 text-xs text-emerald-700 dark:text-emerald-300 font-medium">
            Save {completedSetFlags.filter(Boolean).length} tracked set{completedSetFlags.filter(Boolean).length !== 1 ? "s" : ""}?
          </p>
          <button
            onClick={() => handleSavePartialSets(ex)}
            className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 transition-colors"
          >
            Save
          </button>
          <button
            onClick={() => { setShowSavePartialWarning(false); setView({ kind: "icons" }); }}
            className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            Discard
          </button>
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
        <div className="flex flex-col items-center gap-1">
          <div className="w-28 h-28 rounded-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 ring-2 ring-zinc-200 dark:ring-zinc-700">
            <ExerciseIcon name={ex.name} muscleGroup={ex.muscleGroup} className="h-16 w-16" />
          </div>
          <p className="mt-1 text-base font-bold text-zinc-900 dark:text-white text-center">{ex.name}</p>
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
                  <span className={cn("text-center", ex.isBodyweight ? "flex-1" : "flex-1")}>Reps</span>
                  {!ex.isBodyweight && <span className="flex-1 text-center">kg</span>}
                  <button
                    onClick={() => setIsManualEditMode((v) => !v)}
                    className="ml-1 rounded-md border border-zinc-200 dark:border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    {isManualEditMode ? "Done" : "Edit"}
                  </button>
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

              {/* ── Large rest timer banner ─────────────────────────────── */}
              {autoTrack && timerSetIdx !== null && !timerMinimized && (
                <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 px-4 py-6 mb-3 text-center relative">
                  <button
                    onClick={() => setTimerMinimized(true)}
                    className="absolute top-2 right-2 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-white/50 dark:hover:bg-zinc-800/50 transition-colors"
                    aria-label="Minimize timer"
                  >
                    <Minimize2 className="h-4 w-4" />
                  </button>
                  <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-2">
                    Rest · Set {timerSetIdx + 1} done ✓
                  </p>
                  <p className="text-7xl font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums leading-none">
                    {formatTimer(timerLeft)}
                  </p>
                  <button
                    onClick={() => handleSkipTimer(timerSetIdx, ex)}
                    className="mt-4 text-xs text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 underline underline-offset-2"
                  >
                    Skip rest
                  </button>
                </div>
              )}

              {sets.map((set, i) => {
                const isActive = autoTrack && i === activeSetIdx && !completedSetFlags[i];
                const isTimerRow = autoTrack && timerSetIdx === i;
                const isDoneRow = autoTrack && completedSetFlags[i] && timerSetIdx !== i;
                const isPendingRow = autoTrack && i > activeSetIdx && !completedSetFlags[i];
                const rowDisabled = autoTrack && !isActive;

                if (!autoTrack) {
                  if (!isManualEditMode) {
                    return (
                      <div key={set.setNumber} className="flex items-center gap-1.5 py-1.5">
                        <span className="w-10 shrink-0 text-center text-xs text-zinc-400 dark:text-zinc-500">S{set.setNumber}</span>
                        <span className="flex-1 text-center text-sm font-medium text-zinc-900 dark:text-white">{set.reps || 0}</span>
                        {!ex.isBodyweight && (
                          <span className="flex-1 text-center text-sm font-medium text-zinc-900 dark:text-white">{set.weightKg || 0}</span>
                        )}
                        <span className="w-9 shrink-0" />
                      </div>
                    );
                  }
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
                          {/* Reps stepper */}
                          <div className="flex-1 min-w-0 flex items-center">
                            <button
                              type="button"
                              disabled={rowDisabled}
                              onPointerDown={(e) => { e.preventDefault(); setSets((prev) => prev.map((s, idx) => idx === i ? { ...s, reps: Math.max(0, (Number(s.reps) || 0) - 1) } : s)); }}
                              className="h-9 w-7 shrink-0 flex items-center justify-center rounded-l-lg border border-r-0 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 text-base font-semibold text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 active:bg-zinc-200 dark:active:bg-zinc-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                              tabIndex={-1}
                            >−</button>
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
                              className="h-9 w-full border-y border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 rounded-none px-1 text-center text-sm text-zinc-900 dark:text-white placeholder-zinc-300 dark:placeholder-zinc-600 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:z-10 dark:focus:border-emerald-400 dark:focus:bg-zinc-800 dark:focus:ring-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <button
                              type="button"
                              disabled={rowDisabled}
                              onPointerDown={(e) => { e.preventDefault(); setSets((prev) => prev.map((s, idx) => idx === i ? { ...s, reps: Math.min(9999, (Number(s.reps) || 0) + 1) } : s)); }}
                              className="h-9 w-7 shrink-0 flex items-center justify-center rounded-r-lg border border-l-0 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 text-base font-semibold text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 active:bg-zinc-200 dark:active:bg-zinc-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                              tabIndex={-1}
                            >+</button>
                          </div>
                          {/* Kg stepper */}
                          {!ex.isBodyweight && (
                            <div className="flex-1 min-w-0 flex items-center">
                              <button
                                type="button"
                                disabled={rowDisabled}
                                onPointerDown={(e) => { e.preventDefault(); setSets((prev) => prev.map((s, idx) => { if (idx !== i) return s; const cur = s.weightKg === "" || s.weightKg === 0 ? 0 : Number(s.weightKg); return { ...s, weightKg: parseFloat(Math.max(0, cur - 0.5).toFixed(1)) }; })); }}
                                className="h-9 w-7 shrink-0 flex items-center justify-center rounded-l-lg border border-r-0 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 text-base font-semibold text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 active:bg-zinc-200 dark:active:bg-zinc-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                tabIndex={-1}
                              >−</button>
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
                                className="h-9 w-full border-y border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 rounded-none px-1 text-center text-sm text-zinc-900 dark:text-white placeholder-zinc-300 dark:placeholder-zinc-600 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:z-10 dark:focus:border-emerald-400 dark:focus:bg-zinc-800 dark:focus:ring-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              />
                              <button
                                type="button"
                                disabled={rowDisabled}
                                onPointerDown={(e) => { e.preventDefault(); setSets((prev) => prev.map((s, idx) => { if (idx !== i) return s; const cur = s.weightKg === "" || s.weightKg === 0 ? 0 : Number(s.weightKg); return { ...s, weightKg: parseFloat(Math.min(9999, cur + 0.5).toFixed(1)) }; })); }}
                                className="h-9 w-7 shrink-0 flex items-center justify-center rounded-r-lg border border-l-0 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 text-base font-semibold text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 active:bg-zinc-200 dark:active:bg-zinc-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                tabIndex={-1}
                              >+</button>
                            </div>
                          )}
                        </div>

                        {/* Small minimized timer — only shown when timer active and minimized */}
                        {isTimerRow && timerMinimized ? (
                          <div className="flex flex-col items-center gap-0.5 w-16 shrink-0">
                            <button
                              onClick={() => setTimerMinimized(false)}
                              className="relative w-9 h-9"
                              aria-label="Expand timer"
                            >
                              <svg className="-rotate-90 w-full h-full" viewBox="0 0 36 36">
                                <circle cx="18" cy="18" r="14" fill="none" strokeWidth="3" className="stroke-zinc-200 dark:stroke-zinc-700" />
                                <circle
                                  cx="18" cy="18" r="14" fill="none" strokeWidth="3"
                                  strokeLinecap="round"
                                  className="stroke-emerald-500 dark:stroke-emerald-400"
                                  strokeDasharray={2 * Math.PI * 14}
                                  strokeDashoffset={2 * Math.PI * 14 * (1 - (breakDuration > 0 ? timerLeft / breakDuration : 0))}
                                  style={{ transition: "stroke-dashoffset 0.5s linear" }}
                                />
                              </svg>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-[9px] font-mono font-bold text-zinc-900 dark:text-white leading-none">
                                  {formatTimer(timerLeft)}
                                </span>
                              </div>
                            </button>
                            <button
                              onClick={() => handleSkipTimer(i, ex)}
                              className="text-[9px] text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 underline underline-offset-1 leading-none"
                            >
                              Skip
                            </button>
                          </div>
                        ) : (
                          <span className="w-16 shrink-0" />
                        )}
                      </div>
                  </div>
                );
              })}

              {/* Add / Remove set + Undo last set (automated) */}
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
                {autoTrack && completedSetFlags.some((f) => f) && (
                  <button
                    onClick={handleUndoLastSet}
                    className="ml-auto flex items-center gap-0.5 rounded-md border border-zinc-200 dark:border-zinc-700 px-2 py-1 text-[11px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <ArrowLeft className="h-2.5 w-2.5" /> Back
                  </button>
                )}
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
