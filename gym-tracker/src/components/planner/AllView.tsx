import { cn } from "@/lib/utils";
import { BlockBadge } from "./BlockDot";
import type { PlannedBlock } from "./WorkoutCalendar";
import { Plus } from "lucide-react";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface AllViewProps {
  workouts: PlannedBlock[];
  trackedGroupsByDate: Record<string, Set<string>>;
  onDayClick: (date: string, e: React.MouseEvent) => void;
  onAddClick: (date: string) => void;
}

function isBlockTracked(groups: Set<string> | undefined, blockType: string): boolean {
  if (!groups || groups.size === 0) return false;
  if (blockType === "FULL_BODY") return groups.has("UPPER_BODY") || groups.has("LOWER_BODY") || groups.has("BODYWEIGHT");
  if (blockType === "CARDIO") return groups.has("CARDIO");
  return groups.has(blockType);
}

function groupByMonth(workouts: PlannedBlock[]): Map<string, PlannedBlock[]> {
  const map = new Map<string, PlannedBlock[]>();
  for (const w of workouts) {
    const key = w.date.slice(0, 7); // YYYY-MM
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(w);
  }
  return map;
}

export function AllView({ workouts, trackedGroupsByDate, onDayClick, onAddClick }: AllViewProps) {
  const today = new Date().toISOString().split("T")[0];
  const sorted = [...workouts].sort((a, b) => a.date.localeCompare(b.date));
  const grouped = groupByMonth(sorted);

  if (sorted.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700 py-12 text-center text-zinc-400 dark:text-zinc-500">
        <p className="text-sm">No workouts planned yet.</p>
        <p className="text-xs mt-1">Switch to Month or Week view to add blocks.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {[...grouped.entries()].map(([monthKey, blocks]) => {
        const [y, m] = monthKey.split("-").map(Number);
        return (
          <div key={monthKey}>
            <h3 suppressHydrationWarning className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-2 uppercase tracking-wide">
              {MONTH_NAMES[m - 1]} {y}
            </h3>
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800 overflow-hidden">
              {blocks.map((b) => {
                const isTracked = isBlockTracked(trackedGroupsByDate[b.date], b.blockType);
                const isToday = b.date === today;
                const d = new Date(b.date + "T12:00:00");
                return (
                  <button
                    key={b.id}
                    onClick={(e) => onDayClick(b.date, e)}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors",
                      isToday && "bg-emerald-50/50 dark:bg-emerald-900/10"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span suppressHydrationWarning className="text-sm text-zinc-600 dark:text-zinc-300 w-28 shrink-0">
                        {d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      </span>
                      <BlockBadge blockType={b.blockType} />
                    </div>
                    {isTracked ? (
                      <span className="text-xs text-emerald-500 font-medium">✓ Tracked</span>
                    ) : (
                      <span className="text-xs text-zinc-400">Tap to manage</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
