"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { MonthView } from "./MonthView";
import { WeekView } from "./WeekView";
import { YearView } from "./YearView";
import { AllView } from "./AllView";
import { AddBlockModal } from "./AddBlockModal";
import { DayContextMenu } from "./DayContextMenu";

export interface PlannedBlock {
  id: string;
  date: string; // YYYY-MM-DD
  blockType: string;
  seriesId: string | null;
}

type View = "month" | "week" | "year" | "all";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface WorkoutCalendarProps {
  plannedWorkouts: PlannedBlock[];
  workedOutDates: string[];
  initialYear: number;
  initialMonth: number; // 0-indexed
}

export function WorkoutCalendar({
  plannedWorkouts: initialWorkouts,
  workedOutDates: initialWorkedOut,
  initialYear,
  initialMonth,
}: WorkoutCalendarProps) {
  const [view, setView] = useState<View>("month");
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [workouts, setWorkouts] = useState<PlannedBlock[]>(initialWorkouts);
  const [workedOutDates, setWorkedOutDates] = useState<Set<string>>(new Set(initialWorkedOut));

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

  const handleDayLongPress = (date: string, e: React.MouseEvent) => {
    setAddModalDate(date);
  };

  const handleBlockAdded = (block: PlannedBlock) => {
    setWorkouts(prev => [...prev, block]);
  };

  const handleBlocksAdded = (blocks: PlannedBlock[]) => {
    setWorkouts(prev => [...prev, ...blocks]);
  };

  const handleBlockDeleted = (blockId: string) => {
    setWorkouts(prev => prev.filter(b => b.id !== blockId));
  };

  const handleSeriesDeleted = (seriesId: string) => {
    setWorkouts(prev => prev.filter(b => b.seriesId !== seriesId));
  };

  const handleBlockUpdated = (blockId: string, newBlockType: string) => {
    setWorkouts(prev => prev.map(b => b.id === blockId ? { ...b, blockType: newBlockType } : b));
  };

  const handleSeriesUpdated = (seriesId: string, newBlocks: PlannedBlock[]) => {
    setWorkouts(prev => [
      ...prev.filter(b => b.seriesId !== seriesId || new Date(b.date) < new Date()),
      ...newBlocks,
    ]);
  };

  const headerLabel = view === "month"
    ? `${MONTH_NAMES[month]} ${year}`
    : view === "week"
    ? `Week of ${getWeekStart(year, month, weekOffset).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
    : view === "year"
    ? String(year)
    : "All Workouts";

  const showNav = view !== "all";

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {/* View switcher */}
        <div className="flex items-center rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
          {(["month", "week", "year", "all"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
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
          workedOutDates={workedOutDates}
          onDayClick={handleDayClick}
        />
      )}
      {view === "week" && (
        <WeekView
          year={year}
          month={month}
          weekOffset={weekOffset}
          blocksByDate={blocksByDate}
          workedOutDates={workedOutDates}
          onDayClick={handleDayClick}
        />
      )}
      {view === "year" && (
        <YearView
          year={year}
          blocksByDate={blocksByDate}
          onDayClick={handleDayClick}
          onMonthClick={(m) => { setMonth(m); setView("month"); }}
        />
      )}
      {view === "all" && (
        <AllView
          workouts={workouts}
          workedOutDates={workedOutDates}
          onDayClick={(date, e) => handleDayClick(date, e)}
          onAddClick={(date) => setAddModalDate(date)}
        />
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-zinc-500 dark:text-zinc-400">
        {[
          { color: "bg-blue-500", label: "Upper Body" },
          { color: "bg-amber-500", label: "Lower Body" },
          { color: "bg-purple-500", label: "Full Body" },
          { color: "bg-rose-500", label: "Cardio" },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className={cn("w-2 h-2 rounded-full", color)} />
            {label}
          </span>
        ))}
      </div>

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
          workedOut={workedOutDates.has(contextMenu.date)}
          onClose={() => setContextMenu(null)}
          onBlockDeleted={handleBlockDeleted}
          onSeriesDeleted={handleSeriesDeleted}
          onBlockUpdated={handleBlockUpdated}
          onSeriesUpdated={handleSeriesUpdated}
          onAddBlock={() => { setContextMenu(null); setAddModalDate(contextMenu.date); }}
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
