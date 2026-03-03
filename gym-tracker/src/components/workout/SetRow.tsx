"use client";

import { cn } from "@/lib/utils";
import type { SetData } from "@/types";

interface SetRowProps {
  setNumber: number;
  data: SetData;
  isBodyweight: boolean;
  onChange: (updated: SetData) => void;
}

export function SetRow({ setNumber, data, isBodyweight, onChange }: SetRowProps) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-10 text-center text-xs font-medium text-zinc-400 dark:text-zinc-500 shrink-0">
        S{setNumber}
      </span>

      <div className={cn("flex items-center gap-1.5", isBodyweight ? "flex-1" : "flex-1")}>
        {/* Reps input */}
        <div className="flex-1 min-w-0">
          <label className="sr-only">Set {setNumber} reps</label>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={9999}
            value={data.reps === 0 ? "" : data.reps}
            placeholder="reps"
            onChange={(e) =>
              onChange({ ...data, reps: e.target.value === "" ? 0 : parseInt(e.target.value, 10) || 0 })
            }
            className={cn(
              "h-9 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2 text-center text-sm text-zinc-900 placeholder-zinc-300 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-white dark:placeholder-zinc-600 dark:focus:border-emerald-400 dark:focus:bg-zinc-800 dark:focus:ring-emerald-400 transition-colors"
            )}
          />
        </div>

        {/* kg input — hidden for bodyweight */}
        {!isBodyweight && (
          <div className="flex-1 min-w-0">
            <label className="sr-only">Set {setNumber} weight in kg</label>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              max={9999}
              step={0.5}
              value={data.weightKg === 0 || data.weightKg === "" ? "" : data.weightKg}
              placeholder="kg"
              onChange={(e) =>
                onChange({ ...data, weightKg: e.target.value === "" ? "" : parseFloat(e.target.value) || 0 })
              }
              className="h-9 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2 text-center text-sm text-zinc-900 placeholder-zinc-300 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-white dark:placeholder-zinc-600 dark:focus:border-emerald-400 dark:focus:bg-zinc-800 dark:focus:ring-emerald-400 transition-colors"
            />
          </div>
        )}
      </div>
    </div>
  );
}
