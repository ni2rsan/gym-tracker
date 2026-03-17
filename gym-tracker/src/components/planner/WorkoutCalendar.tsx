"use client";

import { useState, useTransition } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { MonthView } from "./MonthView";
import { WeekView } from "./WeekView";
import { YearView } from "./YearView";
import { AllView } from "./AllView";
import { AddBlockModal } from "./AddBlockModal";
import { DayContextMenu } from "./DayContextMenu";
import { StreakCounter } from "./StreakCounter";
import { getStreakDataAction } from "@/actions/planner";
import type { StreakData } from "@/lib/services/plannerService";
import type { PRRecord } from "@/types";

export interface PlannedBlock {
  id: string;
  date: string; // YYYY-MM-DD
  blockType: string;
  seriesId: string | null;
  sorryExcused: boolean;
}

type View = "month" | "week" | "year" | "all";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface WorkoutCalendarProps {
  plannedWorkouts: PlannedBlock[];
  trackedGroupsByDate: Record<string, string[]>;
  initialYear: number;
  initialMonth: number; // 0-indexed
  initialStreakData: StreakData;
  prs: PRRecord[];
}

function isBlockTracked(groups: Set<string> | undefined, blockType: string): boolean {
  if (!groups || groups.size === 0) return false;
  if (blockType === "FULL_BODY") return groups.has("UPPER_BODY") || groups.has("LOWER_BODY") || groups.has("BODYWEIGHT");
  if (blockType === "CARDIO") return groups.has("CARDIO");
  return groups.has(blockType);
}

export function WorkoutCalendar({
  plannedWorkouts: initialWorkouts,
  trackedGroupsByDate: initialTrackedGroups,
  initialYear,
  initialMonth,
  initialStreakData,
  prs,
}: WorkoutCalendarProps) {
  const [view, setView] = useState<View>("month");
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [workouts, setWorkouts] = useState<PlannedBlock[]>(initialWorkouts);
  const [trackedGroups, setTrackedGroups] = useState<Record<string, Set<string>>>(
    Object.fromEntries(Object.entries(initialTrackedGroups).map(([k, v]) => [k, new Set(v)]))
  );
  const [streakData, setStreakData] = useState<StreakData>(initialStreakData);
  const [, startStreakTransition] = useTransition();

  // Modal state
  const [addModalDate, setAddModalDate] = useState<string | null>(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    date: string;
    blocks: PlannedBlock[];
    x: number;
    y: number;
  } | null>(null);

  // Build lookup: date → blocks[]
  const blocksByDate = workouts.reduce<Record<string, PlannedBlock[]>>((acc, b) => {
    if (!acc[b.date]) acc[b.date] = [];
    acc[b.date].push(b);
    return acc;
  }, {});

  // Streak lookup: seriesId → count
  const streakBySeriesId = streakData.streaks.reduce<Record<string, number>>((acc, s) => {
    acc[s.seriesId] = s.count;
    return acc;
  }, {});

  const refreshStreak = () => {
    startStreakTransition(async () => {
      const result = await getStreakDataAction();
      if (result.success && result.data) {
        setStreakData(result.data);
      }
    });
  };

  const navigatePrev = () => {
    if (view === "month") {
      if (month === 0) { setMonth(11); setYear(y => y - 1); }
      else setMonth(m => m - 1);
    } else if (view === "week") {
      const d = getWeekStart(year, month, weekOffset);
      d.setDate(d.getDate() - 7);
      setYear(d.getFullYear()); setMonth(d.getMonth());
      setWeekOffset(0);
    } else if (view === "year") {
      setYear(y => y - 1);
    }
  };

  const navigateNext = () => {
    if (view === "month") {
      if (month === 11) { setMonth(0); setYear(y => y + 1); }
      else setMonth(m => m + 1);
    } else if (view === "week") {
      const d = getWeekStart(year, month, weekOffset);
      d.setDate(d.getDate() + 7);
      setYear(d.getFullYear()); setMonth(d.getMonth());
      setWeekOffset(0);
    } else if (view === "year") {
      setYear(y => y + 1);
    }
  };

  const [weekOffset, setWeekOffset] = useState(0);

  const handleDayClick = (date: string, e: React.MouseEvent) => {
    const blocks = blocksByDate[date] ?? [];
    if (blocks.length === 0) {
      setAddModalDate(date);
    } else {
      setContextMenu({ date, blocks, x: e.clientX, y: e.clientY });
    }
  };

  const handleBlockAdded = (block: PlannedBlock) => {
    setWorkouts(prev => [...prev, block]);
    refreshStreak();
  };

  const handleBlocksAdded = (blocks: PlannedBlock[]) => {
    setWorkouts(prev => [...prev, ...blocks]);
    refreshStreak();
  };

  const handleBlockDeleted = (blockId: string) => {
    setWorkouts(prev => prev.filter(b => b.id !== blockId));
    refreshStreak();
  };

  const handleSeriesDeleted = (seriesId: string) => {
    setWorkouts(prev => prev.filter(b => b.seriesId !== seriesId));
    refreshStreak();
  };

  const handleBlockUpdated = (blockId: string, newBlockType: string) => {
    setWorkouts(prev => prev.map(b => b.id === blockId ? { ...b, blockType: newBlockType } : b));
    refreshStreak();
  };

  const handleSeriesUpdated = (seriesId: string, newBlocks: PlannedBlock[]) => {
    setWorkouts(prev => [
      ...prev.filter(b => b.seriesId !== seriesId || new Date(b.date) < new Date()),
      ...newBlocks,
    ]);
    refreshStreak();
  };

  const handleWorkedOutDeleted = (date: string, removedGroups: string[]) => {
    setTrackedGroups(prev => {
      const existing = prev[date];
      if (!existing) return prev;
      const next = new Set(existing);
      for (const g of removedGroups) next.delete(g);
      if (next.size === 0) {
        const copy = { ...prev };
        delete copy[date];
        return copy;
      }
      return { ...prev, [date]: next };
    });
  };

  const handleBlockExcused = (date: string) => {
    setWorkouts(prev => prev.map(b => b.date === date ? { ...b, sorryExcused: true } : b));
    refreshStreak();
  };

  const handleBlockSorryRevoked = (date: string) => {
    setWorkouts(prev => prev.map(b => b.date === date ? { ...b, sorryExcused: false } : b));
    refreshStreak();
  };

  const headerLabel = view === "month"
    ? `${MONTH_NAMES[month]} ${year}`
    : view === "week"
    ? `Week of ${getWeekStart(year, month, weekOffset).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
    : view === "year"
    ? String(year)
    : "All Workouts";

  const showNav = view !== "all";

  const handleSetView = (v: View) => {
    if (v === "week") {
      const now = new Date();
      const yr = now.getFullYear();
      const mo = now.getMonth();
      setYear(yr);
      setMonth(mo);
      const week0 = getWeekStart(yr, mo, 0);
      const dayOfWeek = now.getDay();
      const daysToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const todayMon = new Date(yr, mo, now.getDate() + daysToMon);
      const weekOff = Math.round((todayMon.getTime() - week0.getTime()) / (7 * 24 * 60 * 60 * 1000));
      setWeekOffset(weekOff);
    }
    setView(v);
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {/* View switcher */}
        <div className="flex items-center rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
          {(["month", "week", "year", "all"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => handleSetView(v)}
              className={cn(
                "px-3 py-1.5 text-sm font-medium transition-colors",
                view === v
                  ? "bg-emerald-500 text-white"
                  : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              )}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        {/* Navigation */}
        {showNav && (
          <div className="flex items-center gap-2">
            <button
              onClick={navigatePrev}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span suppressHydrationWarning className="text-sm font-medium text-zinc-900 dark:text-white min-w-[160px] text-center">
              {headerLabel}
            </span>
            <button
              onClick={navigateNext}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Calendar view */}
      {view === "month" && (
        <MonthView
          year={year}
          month={month}
          blocksByDate={blocksByDate}
          trackedGroupsByDate={trackedGroups}
          onDayClick={handleDayClick}
          selectedDate={contextMenu?.date ?? addModalDate ?? undefined}
        />
      )}
      {view === "week" && (
        <WeekView
          year={year}
          month={month}
          weekOffset={weekOffset}
          blocksByDate={blocksByDate}
          trackedGroupsByDate={trackedGroups}
          onDayClick={handleDayClick}
          selectedDate={contextMenu?.date ?? addModalDate ?? undefined}
        />
      )}
      {view === "year" && (
        <YearView
          year={year}
          blocksByDate={blocksByDate}
          trackedGroupsByDate={trackedGroups}
          onDayClick={handleDayClick}
          onMonthClick={(m) => { setMonth(m); setView("month"); }}
        />
      )}
      {view === "all" && (
        <AllView
          workouts={workouts}
          trackedGroupsByDate={trackedGroups}
          onDayClick={(date, e) => handleDayClick(date, e)}
          onAddClick={(date) => setAddModalDate(date)}
        />
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-zinc-500 dark:text-zinc-400">
        {[
          { color: "bg-blue-300", label: "Upper Body" },
          { color: "bg-green-300", label: "Lower Body" },
          { color: "bg-stone-400", label: "Full Body" },
          { color: "bg-purple-300", label: "Bodyweight" },
          { color: "bg-rose-300", label: "Cardio" },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className={cn("w-2 h-2 rounded-full", color)} />
            {label}
          </span>
        ))}
      </div>

      {/* Streak counter */}
      <StreakCounter streakData={streakData} prs={prs} />

      {/* Add block modal */}
      {addModalDate && (
        <AddBlockModal
          date={addModalDate}
          onClose={() => setAddModalDate(null)}
          onBlockAdded={handleBlockAdded}
          onBlocksAdded={handleBlocksAdded}
        />
      )}

      {/* Day context menu */}
      {contextMenu && (
        <DayContextMenu
          date={contextMenu.date}
          blocks={contextMenu.blocks}
          x={contextMenu.x}
          y={contextMenu.y}
          workedOut={!!(trackedGroups[contextMenu.date]?.size)}
          trackedGroupsForDate={[...(trackedGroups[contextMenu.date] ?? new Set())].map(String)}
          onClose={() => setContextMenu(null)}
          onBlockDeleted={handleBlockDeleted}
          onSeriesDeleted={handleSeriesDeleted}
          onBlockUpdated={handleBlockUpdated}
          onSeriesUpdated={handleSeriesUpdated}
          onAddBlock={() => { setContextMenu(null); setAddModalDate(contextMenu.date); }}
          onWorkedOutDeleted={handleWorkedOutDeleted}
          onBlockExcused={handleBlockExcused}
          onBlockSorryRevoked={handleBlockSorryRevoked}
          streakBySeriesId={streakBySeriesId}
          sorryRemaining={streakData.sorryRemaining}
        />
      )}
    </div>
  );
}

function getWeekStart(year: number, month: number, offset: number): Date {
  const now = new Date(year, month, 1);
  const day = now.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // go to Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff + offset * 7);
  return monday;
}
