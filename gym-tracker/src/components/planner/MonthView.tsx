import { cn } from "@/lib/utils";
import { BlockDot } from "./BlockDot";
import type { PlannedBlock } from "./WorkoutCalendar";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface MonthViewProps {
  year: number;
  month: number;
  blocksByDate: Record<string, PlannedBlock[]>;
  trackedGroupsByDate: Record<string, Set<string>>;
  onDayClick: (date: string, e: React.MouseEvent) => void;
  selectedDate?: string;
}

function toISO(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isBlockTracked(groups: Set<string> | undefined, blockType: string): boolean {
  if (!groups || groups.size === 0) return false;
  if (blockType === "FULL_BODY") return groups.has("UPPER_BODY") || groups.has("LOWER_BODY") || groups.has("BODYWEIGHT");
  if (blockType === "CARDIO") return groups.has("CARDIO");
  return groups.has(blockType);
}

export function MonthView({ year, month, blocksByDate, trackedGroupsByDate, onDayClick, selectedDate }: MonthViewProps) {
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
                className="h-12 border-r border-b border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/30"
              />
            );
          }

          const iso = toISO(date);
          const blocks = blocksByDate[iso] ?? [];
          const isToday = iso === today;
          const isSelected = iso === selectedDate;
          const groups = trackedGroupsByDate[iso];
          const isAnyTracked = blocks.some((b) => isBlockTracked(groups, b.blockType));
          const isAnySorryExcused = blocks.some((b) => b.sorryExcused);
          const showSorryBadge = isAnySorryExcused && !isAnyTracked;

          return (
            <button
              key={iso}
              onClick={(e) => onDayClick(iso, e)}
              className={cn(
                "relative h-12 p-0.5 transition-colors flex flex-col items-center justify-center gap-px",
                isSelected
                  ? "border-2 border-amber-400 bg-amber-50 dark:bg-amber-500/15 dark:border-amber-400/50"
                  : isToday
                    ? "border border-emerald-300 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20"
                    : "border-r border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
              )}
            >
              {showSorryBadge && (
                <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full border border-amber-400 bg-amber-100 dark:border-amber-500 dark:bg-amber-900/40 flex items-center justify-center pointer-events-none font-bold text-amber-600 dark:text-amber-400" style={{ fontSize: "6px" }}>S</span>
              )}
              <span className={cn(
                "text-[10px] font-medium flex items-center justify-center shrink-0",
                isSelected
                  ? "text-amber-600 dark:text-amber-400 font-bold"
                  : isToday
                    ? "text-emerald-600 dark:text-emerald-400 font-bold"
                    : "text-zinc-700 dark:text-zinc-300"
              )}>
                {date.getDate()}
              </span>

              {/* Block dots */}
              {blocks.length > 0 && (
                <div className="flex flex-wrap gap-px justify-center items-center">
                  {blocks.every((b) => isBlockTracked(groups, b.blockType) || b.sorryExcused) ? (
                    <BlockDot blockType={blocks[0].blockType} size="md" status="tracked" />
                  ) : (
                    blocks.map((b) => {
                      const tracked = isBlockTracked(groups, b.blockType);
                      const missed = !tracked && !b.sorryExcused && !isToday && iso < today;
                      return (
                        <BlockDot
                          key={b.id}
                          blockType={b.blockType}
                          size="md"
                          status={(tracked || b.sorryExcused) ? "tracked" : missed ? "missed" : undefined}
                        />
                      );
                    })
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
