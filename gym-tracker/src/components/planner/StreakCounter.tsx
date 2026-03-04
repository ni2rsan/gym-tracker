"use client";

import { cn } from "@/lib/utils";
import { BLOCK_LABELS } from "@/constants/exercises";
import type { BlockType } from "@/constants/exercises";
import type { StreakData } from "@/lib/services/plannerService";

const SORRY_MAX = 3;

function getMotivation(streak: number): string {
  if (streak === 0) return "Start your streak today!";
  if (streak < 7) return "Keep it up!";
  if (streak < 14) return "One week strong! 💪";
  if (streak < 30) return "Two weeks! You're on fire! 🔥";
  return "Incredible dedication! 🏆";
}

interface SorryTokensProps {
  used: number;
}

function SorryTokens({ used }: SorryTokensProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex gap-1.5">
        {Array.from({ length: SORRY_MAX }, (_, i) => {
          const isUsed = i < used;
          return (
            <div
              key={i}
              className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center text-[9px] font-bold transition-all",
                isUsed
                  ? "border-zinc-400 bg-zinc-200 dark:border-zinc-600 dark:bg-zinc-700 text-zinc-400 dark:text-zinc-500"
                  : "border-amber-400 bg-amber-100 dark:border-amber-500 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400"
              )}
              title={isUsed ? "SORRY token used" : "SORRY token available"}
            >
              {isUsed ? "✗" : "S"}
            </div>
          );
        })}
      </div>
      <span className="text-[10px] text-amber-700/70 dark:text-amber-300/50 font-medium">
        SORRY tokens — {SORRY_MAX - used} of {SORRY_MAX} left this month
      </span>
    </div>
  );
}

interface StreakCardProps {
  blockType: string;
  count: number;
}

function StreakCard({ blockType, count }: StreakCardProps) {
  const label = BLOCK_LABELS[blockType as BlockType] ?? blockType;
  const motivation = getMotivation(count);

  return (
    <div className="flex flex-col items-center gap-1 px-6">
      {/* Flame + count */}
      <div className="flex items-end gap-1">
        <span
          className={cn(
            "text-4xl leading-none transition-transform",
            count > 0 ? "animate-none" : "opacity-30 grayscale"
          )}
        >
          🔥
        </span>
        <span className="text-5xl font-black leading-none text-white drop-shadow-md tabular-nums">
          {count}
        </span>
      </div>

      {/* "day streak" label */}
      <div className="text-xs font-semibold text-white/80 uppercase tracking-widest">
        day streak
      </div>

      {/* Block type badge */}
      <div className="text-xs text-white/60 font-medium">{label}</div>

      {/* Motivation */}
      <div className="mt-1 text-sm font-semibold text-white/90 text-center leading-tight">
        {motivation}
      </div>
    </div>
  );
}

interface StreakCounterProps {
  streakData: StreakData;
}

export function StreakCounter({ streakData }: StreakCounterProps) {
  const { streaks, sorryUsed } = streakData;

  // Only show when there are active series
  if (!streaks || streaks.length === 0) return null;

  return (
    <div className="mt-6 rounded-2xl overflow-hidden shadow-lg">
      {/* Gradient header */}
      <div className="bg-gradient-to-br from-amber-400 via-orange-400 to-orange-500 dark:from-amber-700 dark:via-orange-700 dark:to-orange-800 p-5">
        <div className="text-center mb-4">
          <h3 className="text-base font-bold text-white/90 uppercase tracking-wider text-sm">
            Workout Streak
          </h3>
        </div>

        {/* Streak cards — one per series */}
        <div
          className={cn(
            "flex justify-center gap-8 flex-wrap",
            streaks.length === 1 && "justify-center"
          )}
        >
          {streaks.map((s) => (
            <StreakCard key={s.seriesId} blockType={s.blockType} count={s.count} />
          ))}
        </div>
      </div>

      {/* SORRY tokens row */}
      <div className="bg-amber-50 dark:bg-zinc-900/80 border-t border-amber-200 dark:border-amber-900/40 py-3 px-5 flex justify-center">
        <SorryTokens used={sorryUsed} />
      </div>
    </div>
  );
}
