"use client";

import { cn } from "@/lib/utils";
import type { TrainingBalance } from "@/lib/services/progressService";

interface TrainingBalanceCardProps {
  data: TrainingBalance;
}

const GROUPS = [
  { key: "upperBody" as const, label: "Upper Body", color: "bg-blue-400", text: "text-blue-600 dark:text-blue-400" },
  { key: "lowerBody" as const, label: "Lower Body", color: "bg-green-400", text: "text-green-600 dark:text-green-400" },
  { key: "bodyweight" as const, label: "Bodyweight", color: "bg-purple-400", text: "text-purple-600 dark:text-purple-400" },
];

export function TrainingBalanceCard({ data }: TrainingBalanceCardProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-100 dark:border-zinc-800">
      <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-3">
        Trainingsbalance · 30 Tage
      </div>

      {/* Stacked bar */}
      <div className="flex h-4 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
        {GROUPS.map((g) => {
          const pct = data[g.key].pct;
          if (pct === 0) return null;
          return (
            <div
              key={g.key}
              className={cn("h-full transition-all duration-500", g.color)}
              style={{ width: `${pct}%` }}
            />
          );
        })}
      </div>

      {/* Labels */}
      <div className="flex justify-between mt-3 gap-2">
        {GROUPS.map((g) => (
          <div key={g.key} className="flex items-center gap-1.5">
            <span className={cn("w-2 h-2 rounded-full shrink-0", g.color)} />
            <span className="text-[11px] text-zinc-600 dark:text-zinc-400">
              <span className={cn("font-bold tabular-nums", g.text)}>{data[g.key].pct}%</span>{" "}
              <span className="hidden sm:inline">{g.label}</span>
            </span>
          </div>
        ))}
      </div>

      {/* Total sets */}
      <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-2">
        {data.total} Sets insgesamt
      </div>
    </div>
  );
}
