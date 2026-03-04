import { cn } from "@/lib/utils";
import { BlockDot } from "./BlockDot";
import type { PlannedBlock } from "./WorkoutCalendar";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface MonthViewProps {
  year: number;
  month: number;
  blocksByDate: Record<string, PlannedBlock[]>;
  workedOutDates: Set<string>;
  onDayClick: (date: string, e: React.MouseEvent) => void;
}

function toISO(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function MonthView({ year, month, blocksByDate, workedOutDates, onDayClick }: MonthViewProps) {
  const today = toISO(new Date());
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // ISO week: Monday = 0
  const startOffset = (firstDay.getDay() + 6) % 7;
  const totalCells = Math.ceil((startOffset + lastDay.getDate()) / 7) * 7;

  const cells: (Date | null)[] = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startOffset + 1;
    if (dayNum < 1 || dayNum > lastDay.getDate()) {
      cells.push(null);
    } else {
      cells.push(new Date(year, month, dayNum));
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-medium text-zinc-500 dark:text-zinc-400">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {cells.map((date, i) => {
          if (!date) {
            return (
              <div
                key={`empty-${i}`}
                className="aspect-square border-r border-b border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/30"
              />
            );
          }

          const iso = toISO(date);
          const blocks = blocksByDate[iso] ?? [];
          const isToday = iso === today;
          const isTracked = workedOutDates.has(iso);

          return (
            <button
              key={iso}
              onClick={(e) => onDayClick(iso, e)}
              className={cn(
                "aspect-square p-1 border-r border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors flex flex-col items-center justify-start gap-0.5",
                isToday && "bg-emerald-50/50 dark:bg-emerald-900/10"
              )}
            >
              <span className={cn(
                "text-[11px] font-medium w-5 h-5 flex items-center justify-center rounded-full shrink-0",
                isToday
                  ? "bg-emerald-500 text-white"
                  : "text-zinc-700 dark:text-zinc-300"
              )}>
                {date.getDate()}
              </span>

              {/* Block dots */}
              <div className="flex flex-wrap gap-0.5 justify-center">
                {blocks.map((b) => (
                  <BlockDot key={b.id} blockType={b.blockType} size="lg" />
                ))}
                {isTracked && blocks.length > 0 && (
                  <span className="text-emerald-500 text-[8px] leading-none">✓</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
