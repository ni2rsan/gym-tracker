import { cn } from "@/lib/utils";
import type { PlannedBlock } from "./WorkoutCalendar";
import { BLOCK_COLORS } from "@/constants/exercises";
import type { BlockType } from "@/constants/exercises";

const MONTH_NAMES_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface YearViewProps {
  year: number;
  blocksByDate: Record<string, PlannedBlock[]>;
  onDayClick: (date: string, e: React.MouseEvent) => void;
  onMonthClick: (month: number) => void;
}

function toISO(date: Date) {
  return date.toISOString().split("T")[0];
}

function MiniMonth({ year, month, blocksByDate, onDayClick, onMonthClick }: {
  year: number;
  month: number;
  blocksByDate: Record<string, PlannedBlock[]>;
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
          if (!dayNum) return <div key={`e-${i}`} />;
          const iso = toISO(new Date(year, month, dayNum));
          const blocks = blocksByDate[iso] ?? [];
          const isToday = iso === today;
          // Use first block's color or show empty
          const dotColor = blocks[0] ? BLOCK_COLORS[blocks[0].blockType as BlockType] : null;

          return (
            <button
              key={iso}
              onClick={(e) => onDayClick(iso, e)}
              className={cn(
                "relative flex items-center justify-center rounded text-[10px] aspect-square hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors",
                isToday && "ring-1 ring-emerald-500"
              )}
              title={iso}
            >
              <span className={cn(
                dotColor ? "text-white font-bold text-[9px]" : "text-zinc-600 dark:text-zinc-400",
              )}>
                {dayNum}
              </span>
              {dotColor && (
                <span className={cn("absolute inset-0 rounded opacity-80", dotColor)} style={{ zIndex: -1 }} />
              )}
              {blocks.length > 1 && (
                <span className="absolute bottom-0 right-0 w-1 h-1 rounded-full bg-white/70" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function YearView({ year, blocksByDate, onDayClick, onMonthClick }: YearViewProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {Array.from({ length: 12 }, (_, i) => (
        <MiniMonth
          key={i}
          year={year}
          month={i}
          blocksByDate={blocksByDate}
          onDayClick={onDayClick}
          onMonthClick={onMonthClick}
        />
      ))}
    </div>
  );
}
