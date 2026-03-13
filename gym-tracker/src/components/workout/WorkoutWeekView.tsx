"use client";

import { cn } from "@/lib/utils";
import { BlockDot } from "@/components/planner/BlockDot";
import type { WorkoutDayData } from "@/lib/services/workoutService";

type PlannerBlock = { id: string; blockType: string; sorryExcused: boolean };

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function isBlockTracked(groups: Set<string> | undefined, blockType: string): boolean {
  if (!groups || groups.size === 0) return false;
  if (blockType === "FULL_BODY") return groups.has("UPPER_BODY") || groups.has("LOWER_BODY") || groups.has("BODYWEIGHT");
  if (blockType === "CARDIO") return groups.has("CARDIO");
  return groups.has(blockType);
}

export function getWeekDates(anchorDate: string): string[] {
  const d = new Date(anchorDate + "T12:00:00");
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(mon);
    dd.setDate(mon.getDate() + i);
    return dd.toISOString().split("T")[0];
  });
}

interface WorkoutWeekViewProps {
  anchorDate: string;
  data: WorkoutDayData[];
  selectedDate: string;
  onDateSelect: (date: string) => void;
  plannerBlocksByDate?: Record<string, PlannerBlock[]>;
}

export function WorkoutWeekView({ anchorDate, data, selectedDate, onDateSelect, plannerBlocksByDate }: WorkoutWeekViewProps) {
  const weekDates = getWeekDates(anchorDate);
  const dataByDate = Object.fromEntries(data.map((d) => [d.date, d]));
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="grid grid-cols-7 gap-1.5">
      {weekDates.map((date, i) => {
        const dayData = dataByDate[date];
        const isSelected = date === selectedDate;
        const isToday = date === today;
        const dayNum = parseInt(date.split("-")[2], 10);

        const trackedGroups = dayData
          ? new Set(dayData.exercises.map((e) => e.muscleGroup))
          : undefined;

        const plannerBlocks = plannerBlocksByDate?.[date] ?? [];
        const workoutMuscleGroups = dayData
          ? [...new Set(dayData.exercises.map((e) => e.muscleGroup))]
          : [];

        return (
          <button
            key={date}
            onClick={() => onDateSelect(date)}
            className={cn(
              "flex flex-col items-center gap-1 p-2 border-2 transition-colors text-center",
              isSelected
                ? "rounded-none border-amber-400 bg-amber-50 dark:bg-amber-500/15 dark:border-amber-400/50"
                : isToday
                  ? "rounded-xl border-zinc-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10"
                  : "rounded-xl border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
            )}
          >
            <span
              className={cn(
                "text-[10px] font-medium uppercase tracking-wide",
                isSelected
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-zinc-500 dark:text-zinc-400"
              )}
            >
              {DAY_LABELS[i]}
            </span>
            <span
              className={cn(
                "text-sm font-semibold",
                isSelected
                  ? "text-amber-700 dark:text-amber-300"
                  : isToday
                    ? "text-zinc-900 dark:text-white"
                    : "text-zinc-700 dark:text-zinc-300"
              )}
            >
              {dayNum}
            </span>
            <div className="flex flex-wrap gap-0.5 justify-center min-h-[16px]">
              {plannerBlocks.length > 0 ? (
                plannerBlocks.every((b) => isBlockTracked(trackedGroups, b.blockType) || b.sorryExcused) ? (
                  <BlockDot blockType={plannerBlocks[0].blockType} size="sm" status="tracked" />
                ) : (
                  plannerBlocks.map((b) => {
                    const tracked = isBlockTracked(trackedGroups, b.blockType);
                    const missed = !tracked && !b.sorryExcused && !isToday && date < today;
                    const status = (tracked || b.sorryExcused) ? "tracked" : missed ? "missed" : undefined;
                    return <BlockDot key={b.id} blockType={b.blockType} size="sm" status={status} />;
                  })
                )
              ) : (
                workoutMuscleGroups.length > 1 ? (
                  <BlockDot blockType={workoutMuscleGroups[0]} size="sm" status="tracked" />
                ) : (
                  workoutMuscleGroups.map((mg) => (
                    <BlockDot key={mg} blockType={mg} size="sm" status="tracked" />
                  ))
                )
              )}
            </div>
            {dayData && (
              <span className="text-[9px] text-zinc-400 dark:text-zinc-500">
                {dayData.exercises.length}ex
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
