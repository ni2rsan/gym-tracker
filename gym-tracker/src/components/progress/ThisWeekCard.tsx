"use client";

import { cn } from "@/lib/utils";

function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function buildWeekDays(thisWeekWorkouts: string[]) {
  const workedSet = new Set(thisWeekWorkouts);
  const today = new Date();
  const todayISO = toISO(today);
  const DAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const cur = new Date(monday);
    cur.setDate(monday.getDate() + i);
    const iso = toISO(cur);
    return {
      iso,
      label: DAY_LABELS[i],
      worked: workedSet.has(iso),
      isToday: iso === todayISO,
      isFuture: iso > todayISO,
    };
  });
}

interface ThisWeekCardProps {
  thisWeekWorkouts: string[];
  plannedThisWeek: number;
  completedThisWeek: number;
}

export function ThisWeekCard({ thisWeekWorkouts, plannedThisWeek, completedThisWeek }: ThisWeekCardProps) {
  const days = buildWeekDays(thisWeekWorkouts);

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-100 dark:border-zinc-800">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
          Diese Woche
        </div>
        {plannedThisWeek > 0 && (
          <div className="text-xs font-bold text-amber-500 tabular-nums">
            {completedThisWeek}/{plannedThisWeek} erledigt
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-1">
        {days.map((day) => (
          <div key={day.iso} className="flex flex-col items-center gap-1">
            <div
              className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center transition-all",
                day.worked
                  ? "bg-amber-500 ring-2 ring-amber-300"
                  : day.isToday
                  ? "border-2 border-amber-400 bg-amber-50 dark:bg-amber-900/20"
                  : day.isFuture
                  ? "border border-zinc-200 dark:border-zinc-700"
                  : "bg-zinc-100 dark:bg-zinc-800"
              )}
            >
              {day.worked && <span className="text-[11px] font-black leading-none text-white drop-shadow-sm">✓</span>}
            </div>
            <span className="text-[9px] font-semibold text-zinc-400 dark:text-zinc-500">
              {day.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
