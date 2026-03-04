import { cn } from "@/lib/utils";
import type { PlannedBlock } from "./WorkoutCalendar";
import { BLOCK_COLORS } from "@/constants/exercises";
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

function isAnyBlockTracked(groups: Set<string> | undefined, blocks: PlannedBlock[]): boolean {
  if (!groups || groups.size === 0) return false;
  return blocks.some((b) => {
    if (b.blockType === "FULL_BODY") return groups.has("UPPER_BODY") || groups.has("LOWER_BODY") || groups.has("BODYWEIGHT");
    if (b.blockType === "CARDIO") return groups.has("CARDIO");
    return groups.has(b.blockType);
  });
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
          const tracked = isAnyBlockTracked(trackedGroupsByDate[iso], blocks);
          const missed = blocks.length > 0 && !tracked && iso < today;

          return (
            <button
              key={iso}
              onClick={(e) => onDayClick(iso, e)}
              className={cn(
                "flex flex-col items-center justify-center aspect-square rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors",
                isToday && "ring-1 ring-emerald-500"
              )}
              title={iso}
            >
              <span className={cn(
                "text-[9px] leading-none",
                isToday ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-zinc-600 dark:text-zinc-400"
              )}>
                {dayNum}
              </span>
              {blocks.length > 0 && (
                <div className="flex gap-px mt-0.5 items-center">
                  {blocks.slice(0, 2).map((b) => (
                    <span
                      key={b.id}
                      className={cn("w-1 h-1 rounded-full", BLOCK_COLORS[b.blockType as BlockType] ?? "bg-zinc-400")}
                    />
                  ))}
                  {tracked && <span className="text-emerald-500 text-[8px] leading-none">✓</span>}
                  {missed && <span className="text-red-500 text-[8px] leading-none">✗</span>}
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
