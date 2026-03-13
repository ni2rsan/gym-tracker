"use client";

import { cn } from "@/lib/utils";
import { BlockDot } from "@/components/planner/BlockDot";
import type { WorkoutDayData } from "@/lib/services/workoutService";

type PlannerBlock = { id: string; blockType: string; sorryExcused: boolean };

const DAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function isBlockTracked(groups: Set<string> | undefined, blockType: string): boolean {
  if (!groups || groups.size === 0) return false;
  if (blockType === "FULL_BODY") return groups.has("UPPER_BODY") || groups.has("LOWER_BODY") || groups.has("BODYWEIGHT");
  if (blockType === "CARDIO") return groups.has("CARDIO");
  return groups.has(blockType);
}

export function getMonthRange(anchorDate: string): { start: string; end: string } {
  const [year, month] = anchorDate.split("-").map(Number);
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

function buildCalendarGrid(anchorDate: string): (string | null)[] {
  const [year, month] = anchorDate.split("-").map(Number);
  const firstDay = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const lastDay = new Date(year, month, 0).getDate();
  // Offset: Monday-first. Sunday=0 → 6, Mon=1 → 0, ...
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  const cells: (string | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= lastDay; d++) {
    cells.push(`${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

interface WorkoutMonthViewProps {
  anchorDate: string;
  data: WorkoutDayData[];
  selectedDate: string;
  onDateSelect: (date: string) => void;
  plannerBlocksByDate?: Record<string, PlannerBlock[]>;
}

export function WorkoutMonthView({ anchorDate, data, selectedDate, onDateSelect, plannerBlocksByDate }: WorkoutMonthViewProps) {
  const cells = buildCalendarGrid(anchorDate);
  const dataByDate = Object.fromEntries(data.map((d) => [d.date, d]));
  const today = new Date().toISOString().split("T")[0];

  return (
    <div>
      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_HEADERS.map((h) => (
          <div key={h} className="text-center text-[10px] font-medium text-zinc-400 dark:text-zinc-500 py-1">
            {h}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, idx) => {
          if (!date) {
            return <div key={`empty-${idx}`} />;
          }
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

          const hasActivity = plannerBlocks.length > 0 || workoutMuscleGroups.length > 0;

          return (
            <button
              key={date}
              onClick={() => onDateSelect(date)}
              className={cn(
                "flex flex-col items-center gap-0.5 p-1.5 border transition-colors",
                isSelected
                  ? "rounded-none border-amber-400 bg-amber-50 dark:bg-amber-500/15 dark:border-amber-400/50"
                  : isToday
                    ? "rounded-lg border-zinc-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10"
                    : hasActivity
                      ? "rounded-lg border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-950"
                      : "rounded-lg border-transparent hover:border-zinc-200 dark:hover:border-zinc-800"
              )}
            >
              <span
                className={cn(
                  "text-xs font-semibold leading-none",
                  isSelected
                    ? "text-amber-700 dark:text-amber-300"
                    : isToday
                      ? "text-zinc-900 dark:text-white"
                      : "text-zinc-600 dark:text-zinc-400"
                )}
              >
                {dayNum}
              </span>
              <div className="flex flex-wrap gap-px justify-center min-h-[20px] items-center">
                {plannerBlocks.length > 0 ? (
                  plannerBlocks.every((b) => isBlockTracked(trackedGroups, b.blockType) || b.sorryExcused) ? (
                    <BlockDot blockType={plannerBlocks[0].blockType} size="sm" status="tracked" />
                  ) : (
                    plannerBlocks.slice(0, 3).map((b) => {
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
                    workoutMuscleGroups.slice(0, 3).map((mg) => (
                      <BlockDot key={mg} blockType={mg} size="sm" status="tracked" />
                    ))
                  )
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
