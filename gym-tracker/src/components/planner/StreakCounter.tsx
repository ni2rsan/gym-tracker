"use client";

import { cn } from "@/lib/utils";
import type { StreakData } from "@/lib/services/plannerService";

const SORRY_MAX = 3;

function getMotivation(streak: number): string {
  if (streak === 0) return "Start your streak today!";
  if (streak === 1) return "First day down. Keep going!";
  if (streak < 5) return "Building momentum!";
  if (streak < 7) return "Almost a week — keep it up!";
  if (streak < 14) return "One week strong!";
  if (streak < 21) return "Two weeks — you're on fire!";
  if (streak < 30) return "Three weeks of consistency!";
  return "Incredible dedication!";
}

interface SorryTokensProps {
  used: number;
}

function SorryTokens({ used }: SorryTokensProps) {
  const remaining = SORRY_MAX - used;
  return (
    <div className="flex items-center gap-3">
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
      <span className="text-xs text-amber-700/70 dark:text-amber-300/50 font-medium">
        {remaining} of {SORRY_MAX} SORRY tokens left this month
      </span>
    </div>
  );
}

interface StreakCounterProps {
  streakData: StreakData;
}

export function StreakCounter({ streakData }: StreakCounterProps) {
  const { generalStreak, bestStreak, totalWorkoutsThisMonth, sorryUsed } = streakData;

  const isActive = generalStreak > 0;
  const motivation = getMotivation(generalStreak);

  return (
    <div className="mt-6 rounded-2xl overflow-hidden shadow-lg">
      {/* Main area */}
      <div className="bg-gradient-to-br from-amber-400 via-orange-400 to-orange-500 dark:from-amber-700 dark:via-orange-700 dark:to-orange-800 px-6 pt-5 pb-4 space-y-4">

        {/* Top row: flame + streak + motivation */}
        <div className="flex items-center gap-4">
          <span className={cn("text-5xl leading-none shrink-0", !isActive && "opacity-30 grayscale")}>
            🔥
          </span>
          <div>
            <div className="flex items-end gap-1.5 leading-none">
              <span className="text-6xl font-black text-white drop-shadow-md tabular-nums leading-none">
                {generalStreak}
              </span>
              <span className="text-sm font-bold text-white/70 uppercase tracking-widest pb-1">
                day streak
              </span>
            </div>
            <p className="text-sm font-semibold text-white/80 mt-1">{motivation}</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-white/15 px-4 py-2.5">
            <div className="text-2xl font-black text-white tabular-nums leading-none">{bestStreak}</div>
            <div className="text-[10px] font-semibold text-white/60 uppercase tracking-wide mt-0.5">Best streak</div>
          </div>
          <div className="rounded-xl bg-white/15 px-4 py-2.5">
            <div className="text-2xl font-black text-white tabular-nums leading-none">{totalWorkoutsThisMonth}</div>
            <div className="text-[10px] font-semibold text-white/60 uppercase tracking-wide mt-0.5">This month</div>
          </div>
        </div>
      </div>

      {/* SORRY tokens row */}
      <div className="bg-amber-50 dark:bg-zinc-900/80 border-t border-amber-200 dark:border-amber-900/40 py-3 px-5 flex justify-center">
        <SorryTokens used={sorryUsed} />
      </div>
    </div>
  );
}
