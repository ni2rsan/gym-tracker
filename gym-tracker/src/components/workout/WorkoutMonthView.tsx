"use client";

import { cn } from "@/lib/utils";
import type { WorkoutDayData } from "@/lib/services/workoutService";

const MUSCLE_GROUP_COLORS: Record<string, string> = {
  UPPER_BODY: "bg-blue-400",
  LOWER_BODY: "bg-amber-400",
  BODYWEIGHT: "bg-purple-400",
  CARDIO: "bg-rose-400",
};

const DAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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
}

export function WorkoutMonthView({ anchorDate, data, selectedDate, onDateSelect }: WorkoutMonthViewProps) {
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
          const muscleGroups = dayData
            ? [...new Set(dayData.exercises.map((e) => e.muscleGroup))]
            : [];
          const dayNum = parseInt(date.split("-")[2], 10);

          return (
            <button
              key={date}
              onClick={() => onDateSelect(date)}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-lg p-1.5 border transition-colors",
                isSelected
                  ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                  : isToday
                    ? "border-zinc-400 dark:border-zinc-500 bg-zinc-50 dark:bg-zinc-900"
                    : dayData
                      ? "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-950"
                      : "border-transparent hover:border-zinc-200 dark:hover:border-zinc-800"
              )}
            >
              <span
                className={cn(
                  "text-xs font-semibold leading-none",
                  isSelected
                    ? "text-emerald-700 dark:text-emerald-300"
                    : isToday
                      ? "text-zinc-900 dark:text-white"
                      : "text-zinc-600 dark:text-zinc-400"
                )}
              >
                {dayNum}
              </span>
              <div className="flex flex-wrap gap-px justify-center min-h-[6px]">
                {muscleGroups.slice(0, 3).map((mg) => (
                  <span
                    key={mg}
                    className={cn("w-1.5 h-1.5 rounded-full", MUSCLE_GROUP_COLORS[mg] ?? "bg-zinc-400")}
                  />
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
