"use client";

import { cn } from "@/lib/utils";
import type { WorkoutDayData } from "@/lib/services/workoutService";

const MUSCLE_GROUP_COLORS: Record<string, string> = {
  UPPER_BODY: "bg-blue-400",
  LOWER_BODY: "bg-amber-400",
  BODYWEIGHT: "bg-purple-400",
  CARDIO: "bg-rose-400",
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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
}

export function WorkoutWeekView({ anchorDate, data, selectedDate, onDateSelect }: WorkoutWeekViewProps) {
  const weekDates = getWeekDates(anchorDate);
  const dataByDate = Object.fromEntries(data.map((d) => [d.date, d]));
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="grid grid-cols-7 gap-1.5">
      {weekDates.map((date, i) => {
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
              "flex flex-col items-center gap-1 rounded-xl p-2 border-2 transition-colors text-center",
              isSelected
                ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                : isToday
                  ? "border-zinc-400 dark:border-zinc-500 bg-zinc-50 dark:bg-zinc-900"
                  : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
            )}
          >
            <span
              className={cn(
                "text-[10px] font-medium uppercase tracking-wide",
                isSelected
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-zinc-500 dark:text-zinc-400"
              )}
            >
              {DAY_LABELS[i]}
            </span>
            <span
              className={cn(
                "text-sm font-semibold",
                isSelected
                  ? "text-emerald-700 dark:text-emerald-300"
                  : isToday
                    ? "text-zinc-900 dark:text-white"
                    : "text-zinc-700 dark:text-zinc-300"
              )}
            >
              {dayNum}
            </span>
            <div className="flex flex-wrap gap-0.5 justify-center min-h-[8px]">
              {muscleGroups.map((mg) => (
                <span
                  key={mg}
                  className={cn("w-2 h-2 rounded-full", MUSCLE_GROUP_COLORS[mg] ?? "bg-zinc-400")}
                />
              ))}
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
