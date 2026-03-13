import { cn } from "@/lib/utils";
import type { PlannedBlock } from "./WorkoutCalendar";
import { BLOCK_COLORS, BLOCK_BORDER_COLORS } from "@/constants/exercises";
import type { BlockType } from "@/constants/exercises";

const MONTH_NAMES_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface YearViewProps {
  year: number;
  blocksByDate: Record<string, PlannedBlock[]>;
  trackedGroupsByDate: Record<string, Set<string>>;
  onDayClick: (date: string, e: React.MouseEvent) => void;
  onMonthClick: (month: number) => void;
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

function MiniMonth({ year, month, blocksByDate, trackedGroupsByDate, onDayClick, onMonthClick }: {
  year: number;
  month: number;
  blocksByDate: Record<string, PlannedBlock[]>;
  trackedGroupsByDate: Record<string, Set<string>>;
  onDayClick: (date: string, e: React.MouseEvent) => void;
  onMonthClick: (month: number) => void;
}) {
  const today = toISO(new Date());
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const totalCells = Math.ceil((startOffset + lastDay.getDate()) / 7) * 7;

  const cells: (number | null)[] = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startOffset + 1;
    cells.push(dayNum >= 1 && dayNum <= lastDay.getDate() ? dayNum : null);
  }

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <button
        onClick={() => onMonthClick(month)}
        className="w-full px-2 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-200 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left"
      >
        {MONTH_NAMES_SHORT[month]}
      </button>
      <div className="grid grid-cols-7 p-1 gap-px">
        {cells.map((dayNum, i) => {
          if (!dayNum) return <div key={`e-${i}`} className="aspect-square" />;
          const iso = toISO(new Date(year, month, dayNum));
          const blocks = blocksByDate[iso] ?? [];
          const isToday = iso === today;
          const groups = trackedGroupsByDate[iso];
          const isAnySorryExcused = blocks.some((b) => b.sorryExcused);
          const isAnyTracked = blocks.some((b) => isBlockTracked(groups, b.blockType));
          const allDone = blocks.length > 0 && blocks.every((b) => isBlockTracked(groups, b.blockType) || b.sorryExcused);
          const showSorryBadge = isAnySorryExcused && !isAnyTracked;

          return (
            <button
              key={iso}
              onClick={(e) => onDayClick(iso, e)}
              className={cn(
                "relative flex flex-col items-center justify-center aspect-square rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors",
                isToday && "ring-1 ring-emerald-500"
              )}
              title={iso}
            >
              {showSorryBadge && (
                <span className="absolute top-0 right-0 rounded-full border border-amber-400 bg-amber-100 dark:border-amber-500 dark:bg-amber-900/40 flex items-center justify-center pointer-events-none font-bold text-amber-600 dark:text-amber-400" style={{ fontSize: "4px", width: "7px", height: "7px" }}>S</span>
              )}
              <span className={cn(
                "text-[9px] leading-none",
                isToday ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-zinc-600 dark:text-zinc-400"
              )}>
                {dayNum}
              </span>
              {blocks.length > 0 && (
                <div className="flex gap-px mt-0.5 items-center">
                  {allDone ? (
                    <span className="w-2 h-2 rounded-full inline-flex items-center justify-center bg-amber-500 ring-1 ring-amber-300">
                      <span className="font-bold leading-none text-white" style={{ fontSize: "5px" }}>✓</span>
                    </span>
                  ) : (
                    blocks.slice(0, 2).map((b) => {
                      const trackedBlock = isBlockTracked(groups, b.blockType);
                      const showCheck = trackedBlock || b.sorryExcused;
                      const missed = !trackedBlock && !b.sorryExcused && !isToday && iso < today;
                      return (
                        <span
                          key={b.id}
                          className={cn(
                            "w-2 h-2 rounded-full inline-flex items-center justify-center",
                            showCheck
                              ? "bg-amber-500 ring-1 ring-amber-300"
                              : missed
                                ? cn("border bg-white dark:bg-zinc-900", BLOCK_BORDER_COLORS[b.blockType as BlockType] ?? "border-zinc-400")
                                : (BLOCK_COLORS[b.blockType as BlockType] ?? "bg-zinc-400")
                          )}
                        >
                          {showCheck && <span className="font-bold leading-none text-white" style={{ fontSize: "5px" }}>✓</span>}
                          {missed && <span className="font-bold leading-none" style={{ fontSize: "5px", color: "#cc0000" }}>✗</span>}
                        </span>
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

export function YearView({ year, blocksByDate, trackedGroupsByDate, onDayClick, onMonthClick }: YearViewProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {Array.from({ length: 12 }, (_, i) => (
        <MiniMonth
          key={i}
          year={year}
          month={i}
          blocksByDate={blocksByDate}
          trackedGroupsByDate={trackedGroupsByDate}
          onDayClick={onDayClick}
          onMonthClick={onMonthClick}
        />
      ))}
    </div>
  );
}
