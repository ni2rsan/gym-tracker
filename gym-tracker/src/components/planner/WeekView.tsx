import { cn } from "@/lib/utils";
import { BlockDot, BlockBadge } from "./BlockDot";
import type { PlannedBlock } from "./WorkoutCalendar";

const WEEKDAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface WeekViewProps {
  year: number;
  month: number;
  weekOffset: number;
  blocksByDate: Record<string, PlannedBlock[]>;
  trackedGroupsByDate: Record<string, Set<string>>;
  onDayClick: (date: string, e: React.MouseEvent) => void;
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

function getWeekDays(year: number, month: number, offset: number): Date[] {
  const first = new Date(year, month, 1);
  const day = first.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(year, month, 1 + diff + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

export function WeekView({ year, month, weekOffset, blocksByDate, trackedGroupsByDate, onDayClick }: WeekViewProps) {
  const today = toISO(new Date());
  const days = getWeekDays(year, month, weekOffset);

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
        {days.map((d, i) => {
          const iso = toISO(d);
          const isToday = iso === today;
          return (
            <div key={iso} className="py-2 text-center">
              <div className="text-xs text-zinc-500 dark:text-zinc-400">{WEEKDAY_NAMES[i]}</div>
              <div className={cn(
                "mx-auto mt-0.5 w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium",
                isToday ? "bg-emerald-500 text-white" : "text-zinc-700 dark:text-zinc-300"
              )}>
                {d.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-7 min-h-[120px]">
        {days.map((d) => {
          const iso = toISO(d);
          const blocks = blocksByDate[iso] ?? [];
          const groups = trackedGroupsByDate[iso];
          const isToday = iso === today;

          const isAnyTracked = blocks.some((b) => isBlockTracked(groups, b.blockType));
          const isAnySorryExcused = blocks.some((b) => b.sorryExcused);
          const showSorryBadge = isAnySorryExcused && !isAnyTracked;

          return (
            <button
              key={iso}
              onClick={(e) => onDayClick(iso, e)}
              className={cn(
                "relative p-2 border-r border-zinc-100 dark:border-zinc-800/50 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors flex flex-col gap-1.5",
                isToday && "bg-emerald-50/50 dark:bg-emerald-900/10"
              )}
            >
              {showSorryBadge && (
                <span className="absolute top-0.5 right-0.5 w-3 h-3 rounded-full border border-amber-400 bg-amber-100 dark:border-amber-500 dark:bg-amber-900/40 flex items-center justify-center pointer-events-none font-bold text-amber-600 dark:text-amber-400" style={{ fontSize: "7px" }}>S</span>
              )}
              {blocks.map((b) => {
                const tracked = isBlockTracked(groups, b.blockType);
                const missed = !tracked && !b.sorryExcused && !isToday && iso < today;
                return (
                  <BlockDot
                    key={b.id}
                    blockType={b.blockType}
                    size="lg"
                    status={(tracked || b.sorryExcused) ? "tracked" : missed ? "missed" : undefined}
                  />
                );
              })}
              {blocks.length === 0 && (
                <span className="text-zinc-300 dark:text-zinc-600 text-xs">+</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
