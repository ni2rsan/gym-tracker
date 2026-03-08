"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { BLOCK_LABELS, BLOCK_COLORS, BlockType } from "@/constants/exercises";
import {
  createBlock,
  createSeries,
  updateBlock,
  updateSeries,
  updateSeriesUseSorry,
  updateSeriesResetStreak,
} from "@/actions/planner";
import type { PlannedBlock } from "./WorkoutCalendar";

const WEEKDAY_OPTIONS = [
  { label: "Mo", value: 1 },
  { label: "Tu", value: 2 },
  { label: "We", value: 3 },
  { label: "Th", value: 4 },
  { label: "Fr", value: 5 },
  { label: "Sa", value: 6 },
  { label: "Su", value: 7 },
];

interface AddBlockModalProps {
  date: string;
  onClose: () => void;
  onBlockAdded: (block: PlannedBlock) => void;
  onBlocksAdded: (blocks: PlannedBlock[]) => void;
  // For editing existing block/series
  editBlockId?: string;
  editSeriesId?: string;
  initialBlockType?: string;
  /** Current streak for the series being edited (triggers SORRY prompt if > 0) */
  seriesStreak?: number;
  /** SORRY tokens remaining this month */
  sorryRemaining?: number;
}

type RecurringType = "weekdays" | "interval";
type Step = "type" | "schedule" | "streak-confirm";

export function AddBlockModal({
  date,
  onClose,
  onBlockAdded,
  onBlocksAdded,
  editBlockId,
  editSeriesId,
  initialBlockType,
  seriesStreak = 0,
  sorryRemaining = 3,
}: AddBlockModalProps) {
  const [step, setStep] = useState<Step>("type");
  const [selectedType, setSelectedType] = useState<string>(initialBlockType ?? "");
  const [isRecurring, setIsRecurring] = useState(!!editSeriesId);
  const [recurringType, setRecurringType] = useState<RecurringType>("weekdays");
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([]);
  const [intervalDays, setIntervalDays] = useState(2);
  const [startDate, setStartDate] = useState(date);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isEditingSeries = !!editSeriesId;
  const showStreakConfirm = isEditingSeries && seriesStreak > 0;

  const toggleWeekday = (val: number) => {
    setSelectedWeekdays(prev =>
      prev.includes(val) ? prev.filter(d => d !== val) : [...prev, val]
    );
  };

  const buildSeriesConfig = () => ({
    blockType: selectedType,
    ruleType: recurringType === "weekdays" ? "WEEKDAYS" as const : "INTERVAL" as const,
    weekdays: recurringType === "weekdays" ? selectedWeekdays : [],
    intervalDays: recurringType === "interval" ? intervalDays : undefined,
    startDate,
  });

  const handleScheduleNext = () => {
    setError(null);
    if (!selectedType) { setError("Pick a block type."); return; }

    if (isRecurring) {
      if (recurringType === "weekdays" && selectedWeekdays.length === 0) {
        setError("Select at least one weekday.");
        return;
      }
    }

    // If editing series and has streak → show streak-confirm step
    if (isEditingSeries && showStreakConfirm) {
      setStep("streak-confirm");
    } else {
      executeSave(null);
    }
  };

  /** null = no streak choice needed, "sorry" = use SORRY token, "reset" = reset streak */
  const executeSave = (streakChoice: "sorry" | "reset" | null) => {
    startTransition(async () => {
      let result;

      if (editBlockId && !isRecurring) {
        // Edit single block type
        result = await updateBlock(editBlockId, selectedType);
      } else if (editSeriesId) {
        // Edit series
        const config = buildSeriesConfig();
        if (streakChoice === "sorry") {
          result = await updateSeriesUseSorry(editSeriesId, config);
        } else if (streakChoice === "reset") {
          result = await updateSeriesResetStreak(editSeriesId, config);
        } else {
          result = await updateSeries(editSeriesId, config);
        }
      } else if (!isRecurring) {
        // Create one-off
        result = await createBlock({ date, blockType: selectedType });
        if (result.success) {
          onBlockAdded({ id: `temp-${Date.now()}`, date, blockType: selectedType, seriesId: null });
        }
      } else {
        // Create series
        result = await createSeries(buildSeriesConfig());
      }

      if (result?.success) {
        onClose();
        window.location.reload();
      } else {
        setError(result?.error ?? "Failed to save.");
        if (step === "streak-confirm") setStep("schedule");
      }
    });
  };

  const stepTitle = () => {
    if (step === "type") return "Choose block type";
    if (step === "streak-confirm") return "Streak Warning";
    return "Schedule";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative z-10 w-full sm:max-w-sm bg-white dark:bg-zinc-900 rounded-t-2xl sm:rounded-2xl shadow-xl p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-zinc-900 dark:text-white">{stepTitle()}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step: type */}
        {step === "type" && (
          <>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(BLOCK_LABELS) as [string, string][]).map(([type, label]) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border-2 px-3 py-3 text-sm font-medium transition-all",
                    selectedType === type
                      ? `border-transparent text-white ${BLOCK_COLORS[type as BlockType]}`
                      : "border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-600"
                  )}
                >
                  <span className={cn("w-3 h-3 rounded-full shrink-0", BLOCK_COLORS[type as BlockType])} />
                  {label}
                </button>
              ))}
            </div>

            {selectedType && (
              <button
                onClick={() => setStep("schedule")}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors"
              >
                Next →
              </button>
            )}
          </>
        )}

        {/* Step: schedule */}
        {step === "schedule" && (
          <>
            {/* One-off vs Recurring — only shown when not editing a series */}
            {!isEditingSeries && (
              <div className="flex rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700">
                <button
                  onClick={() => setIsRecurring(false)}
                  className={cn(
                    "flex-1 py-2 text-sm font-medium transition-colors",
                    !isRecurring ? "bg-emerald-500 text-white" : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  )}
                >
                  One-off
                </button>
                <button
                  onClick={() => setIsRecurring(true)}
                  className={cn(
                    "flex-1 py-2 text-sm font-medium transition-colors",
                    isRecurring ? "bg-emerald-500 text-white" : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  )}
                >
                  Recurring
                </button>
              </div>
            )}

            {!isRecurring && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Adds one block on <strong suppressHydrationWarning>{new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</strong>.
              </p>
            )}

            {isRecurring && (
              <div className="space-y-3">
                {/* Rule type */}
                <div className="flex rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700">
                  <button
                    onClick={() => setRecurringType("weekdays")}
                    className={cn(
                      "flex-1 py-2 text-sm font-medium transition-colors",
                      recurringType === "weekdays" ? "bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900" : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    )}
                  >
                    By weekday
                  </button>
                  <button
                    onClick={() => setRecurringType("interval")}
                    className={cn(
                      "flex-1 py-2 text-sm font-medium transition-colors",
                      recurringType === "interval" ? "bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900" : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    )}
                  >
                    Every N days
                  </button>
                </div>

                {recurringType === "weekdays" && (
                  <div className="flex gap-1 justify-between">
                    {WEEKDAY_OPTIONS.map(({ label, value }) => (
                      <button
                        key={value}
                        onClick={() => toggleWeekday(value)}
                        className={cn(
                          "flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors",
                          selectedWeekdays.includes(value)
                            ? "bg-emerald-500 text-white"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}

                {recurringType === "interval" && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-zinc-600 dark:text-zinc-300">Every</span>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={intervalDays}
                      onChange={(e) => setIntervalDays(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 h-8 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 text-sm text-center focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-zinc-600 dark:text-zinc-300">days</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <span className="text-sm text-zinc-600 dark:text-zinc-300">Starting</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="flex-1 h-8 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            )}

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex gap-2">
              <button
                onClick={() => setStep("type")}
                className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={handleScheduleNext}
                disabled={isPending}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
              >
                {isPending ? "Saving…" : showStreakConfirm ? "Next →" : "Save"}
              </button>
            </div>
          </>
        )}

        {/* Step: streak-confirm */}
        {step === "streak-confirm" && (
          <div className="space-y-4">
            {/* Warning */}
            <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 p-4 text-center">
              <div className="text-3xl mb-2">🔥</div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                You have a <span className="text-amber-500 font-black">{seriesStreak}-day streak</span>!
              </p>
              <p className="text-xs text-amber-700/70 dark:text-amber-300/60 mt-1">
                Editing this series will reset your streak unless you use a SORRY token.
              </p>
            </div>

            {/* SORRY option */}
            {sorryRemaining > 0 ? (
              <button
                onClick={() => executeSave("sorry")}
                disabled={isPending}
                className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white shadow-md transition-all disabled:opacity-50"
              >
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border-2 border-white/60 bg-white/20 font-bold text-[8px] leading-none shrink-0 mr-1.5">S</span>
                Use SORRY Token ({sorryRemaining} left) — Keep Streak
              </button>
            ) : (
              <p className="text-xs text-zinc-400 italic text-center py-2">
                No SORRY tokens left this month
              </p>
            )}

            {/* Reset option */}
            <button
              onClick={() => executeSave("reset")}
              disabled={isPending}
              className="w-full py-2.5 rounded-xl border border-red-200 dark:border-red-900/40 text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
            >
              Edit &amp; Reset Streak
            </button>

            {/* Back */}
            <button
              onClick={() => setStep("schedule")}
              className="w-full text-xs text-zinc-400 hover:text-zinc-600 text-center"
            >
              ← Go back
            </button>

            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
