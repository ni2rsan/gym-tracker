"use client";

import { Trophy } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { PRRecord } from "@/types";

interface PRHighlightsProps {
  prs: PRRecord[];
}

export function PRHighlights({ prs }: PRHighlightsProps) {
  const today = new Date().toISOString().split("T")[0];
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoISO = weekAgo.toISOString().split("T")[0];

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
        <Trophy className="h-4 w-4 text-amber-500" />
        <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
          Newest Personal Records
        </span>
      </div>
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {prs.map((pr) => {
          const isRecent = pr.achievedOn >= weekAgoISO && pr.achievedOn <= today;
          return (
            <div
              key={pr.exerciseId}
              className={`flex items-center gap-3 px-4 py-3 ${isRecent ? "border-l-4 border-l-amber-400" : ""}`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                  {pr.exerciseName}
                </p>
                <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums leading-tight">
                  {pr.maxWeightKg != null
                    ? `${Number(pr.maxWeightKg).toFixed(1)} kg × ${pr.repsAtMaxWeight} reps`
                    : `${pr.maxReps} reps`}
                </p>
                {pr.isAssisted && (
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500">↓ lower = better</span>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-zinc-400 dark:text-zinc-500">
                  {formatDate(pr.achievedOn)}
                </p>
                {isRecent && (
                  <span className="text-[9px] font-bold text-amber-500 uppercase">NEW</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
