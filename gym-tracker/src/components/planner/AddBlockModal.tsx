"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { BLOCK_LABELS, BLOCK_COLORS, BlockType } from "@/constants/exercises";
import { createBlock, createSeries } from "@/actions/planner";
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
}

type RecurringType = "weekdays" | "interval";

export function AddBlockModal({
  date,
  onClose,
  onBlockAdded,
  onBlocksAdded,
  editBlockId,
  editSeriesId,
  initialBlockType,
}: AddBlockModalProps) {
  const [step, setStep] = useState<"type" | "schedule">("type");
  const [selectedType, setSelectedType] = useState<string>(initialBlockType ?? "");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringType, setRecurringType] = useState<RecurringType>("weekdays");
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([]);
  const [intervalDays, setIntervalDays] = useState(2);
  const [startDate, setStartDate] = useState(date);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const toggleWeekday = (val: number) => {
    setSelectedWeekdays(prev =>
      prev.includes(val) ? prev.filter(d => d !== val) : [...prev, val]
    );
  };

  const handleSave = () => {
    setError(null);
    if (!selectedType) { setError("Pick a block type."); return; }

    if (!isRecurring) {
      startTransition(async () => {
        const result = await createBlock({ date, blockType: selectedType });
        if (result.success) {
          // Optimistically add — reload will get id, for now use temp
          onBlockAdded({ id: `temp-${Date.now()}`, date, blockType: selectedType, seriesId: null });
          onClose();
          // Hard reload to get real IDs from server
          window.location.reload();
        } else {
          setError(result.error ?? "Failed to save.");
        }
      });
    } else {
      if (recurringType === "weekdays" && selectedWeekdays.length === 0) {
        setError("Select at least one weekday.");
        return;
      }
      startTransition(async () => {
        const result = await createSeries({
          blockType: selectedType,
          ruleType: recurringType === "weekdays" ? "WEEKDAYS" : "INTERVAL",
          weekdays: recurringType === "weekdays" ? selectedWeekdays : [],
          intervalDays: recurringType === "interval" ? intervalDays : undefined,
          startDate,
        });
        if (result.success) {
          onClose();
          window.location.reload();
        } else {
          setError(result.error ?? "Failed to save.");
        }
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative z-10 w-full sm:max-w-sm bg-white dark:bg-zinc-900 rounded-t-2xl sm:rounded-2xl shadow-xl p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-zinc-900 dark:text-white">
            {step === "type" ? "Choose block type" : "Schedule"}
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
            <X className="h-5 w-5" />
          </button>
        </div>

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

        {step === "schedule" && (
          <>
            {/* One-off vs Recurring */}
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
                onClick={handleSave}
                disabled={isPending}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
              >
                {isPending ? "Saving…" : "Save"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
