"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WeeklyVolumeComparison } from "@/lib/services/progressService";

interface VolumeComparisonCardProps {
  data: WeeklyVolumeComparison;
}

function formatKg(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
  return `${kg.toLocaleString("de-DE")} kg`;
}

export function VolumeComparisonCard({ data }: VolumeComparisonCardProps) {
  const { thisWeekKg, lastWeekKg, changeKg, changePct } = data;
  const isUp = changeKg > 0;
  const isDown = changeKg < 0;
  const noData = lastWeekKg === 0 && thisWeekKg === 0;

  if (noData) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-100 dark:border-zinc-800 flex flex-col justify-center">
        <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
          Volumen diese Woche
        </div>
        <div className="text-sm text-zinc-400 dark:text-zinc-500 mt-2">
          Noch nicht genug Daten
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-100 dark:border-zinc-800 flex flex-col gap-1">
      <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
        Volumen diese Woche
      </div>
      <div className="text-2xl font-black text-zinc-900 dark:text-white tabular-nums leading-none mt-1">
        {formatKg(thisWeekKg)}
      </div>
      {lastWeekKg > 0 && (
        <div className="flex items-center gap-1.5 mt-1">
          {isUp ? (
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
          ) : isDown ? (
            <TrendingDown className="h-3.5 w-3.5 text-red-500" />
          ) : (
            <Minus className="h-3.5 w-3.5 text-zinc-400" />
          )}
          <span
            className={cn(
              "text-xs font-bold tabular-nums",
              isUp ? "text-emerald-600 dark:text-emerald-400" : isDown ? "text-red-600 dark:text-red-400" : "text-zinc-500"
            )}
          >
            {isUp ? "+" : ""}{changeKg > 0 ? formatKg(changeKg) : changeKg < 0 ? formatKg(Math.abs(changeKg)) : "0 kg"}
            {changePct !== 0 && ` (${isUp ? "+" : ""}${changePct}%)`}
          </span>
        </div>
      )}
      <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">
        vs. letzte Woche: {formatKg(lastWeekKg)}
      </div>
    </div>
  );
}
