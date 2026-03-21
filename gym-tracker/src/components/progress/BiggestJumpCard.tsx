"use client";

import { TrendingUp } from "lucide-react";
import type { BiggestJumpResult } from "@/lib/services/progressService";

interface BiggestJumpCardProps {
  data: BiggestJumpResult;
}

export function BiggestJumpCard({ data }: BiggestJumpCardProps) {
  const { exerciseName, previousBest, currentBest, absoluteJump, percentJump, isAssisted } = data;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-emerald-200 dark:border-emerald-800/40 bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-500/5 dark:to-transparent">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
          <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
              Größter Sprung
            </span>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
              Letzte 30 Tage
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums leading-none">
              {isAssisted ? "−" : "+"}{absoluteJump} kg
            </span>
            {percentJump > 0 && (
              <span className="text-xs font-bold text-emerald-500/80 dark:text-emerald-400/60 tabular-nums">
                {isAssisted ? "−" : "+"}{percentJump}%
              </span>
            )}
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            <span className="font-medium">{exerciseName}:</span>{" "}
            <span className="tabular-nums">
              {previousBest} kg → {currentBest} kg
            </span>
          </p>
          {isAssisted && (
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">↓ weniger Unterstützung = stärker</p>
          )}
        </div>
      </div>
    </div>
  );
}
