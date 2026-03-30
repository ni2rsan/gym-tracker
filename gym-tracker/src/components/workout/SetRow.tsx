"use client";

import { cn } from "@/lib/utils";
import type { SetData } from "@/types";

interface SetRowProps {
  setNumber: number;
  data: SetData;
  isBodyweight: boolean;
  onChange: (updated: SetData) => void;
}

/** Compact stepper group: [ − ] [ input ] [ + ] */
function StepperInput({
  value,
  placeholder,
  step,
  inputMode,
  onChange,
  onStep,
}: {
  value: number | string;
  placeholder: string;
  step: number;
  inputMode: "numeric" | "decimal";
  onChange: (raw: string) => void;
  onStep: (delta: number) => void;
}) {
  const base =
    "border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 transition-colors";
  const btn =
    "h-9 w-7 shrink-0 flex items-center justify-center text-base font-semibold text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 active:bg-zinc-200 dark:active:bg-zinc-600 select-none";

  return (
    <div className="flex-1 min-w-0 flex items-center">
      <button
        type="button"
        onPointerDown={(e) => { e.preventDefault(); onStep(-step); }}
        className={cn(base, btn, "rounded-l-lg border-r-0")}
        tabIndex={-1}
        aria-label={`Decrease by ${step}`}
      >
        −
      </button>
      <input
        type="number"
        inputMode={inputMode}
        min={0}
        max={9999}
        step={step}
        value={value === 0 ? "" : value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          base,
          "h-9 w-full border-x-0 rounded-none px-1 text-center text-sm text-zinc-900 dark:text-white placeholder-zinc-300 dark:placeholder-zinc-600 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:z-10 dark:focus:border-emerald-400 dark:focus:bg-zinc-800 dark:focus:ring-emerald-400"
        )}
      />
      <button
        type="button"
        onPointerDown={(e) => { e.preventDefault(); onStep(step); }}
        className={cn(base, btn, "rounded-r-lg border-l-0")}
        tabIndex={-1}
        aria-label={`Increase by ${step}`}
      >
        +
      </button>
    </div>
  );
}

export function SetRow({ setNumber, data, isBodyweight, onChange }: SetRowProps) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-10 text-center text-xs font-medium text-zinc-400 dark:text-zinc-500 shrink-0">
        S{setNumber}
      </span>

      <div className={cn("flex items-center gap-1.5", isBodyweight ? "flex-1" : "flex-1")}>
        {/* Reps stepper */}
        <StepperInput
          value={data.reps}
          placeholder="reps"
          step={1}
          inputMode="numeric"
          onChange={(raw) =>
            onChange({ ...data, reps: raw === "" ? 0 : parseInt(raw, 10) || 0 })
          }
          onStep={(delta) =>
            onChange({ ...data, reps: Math.max(0, Math.min(9999, (Number(data.reps) || 0) + delta)) })
          }
        />

        {/* Kg stepper — hidden for bodyweight */}
        {!isBodyweight && (
          <StepperInput
            value={data.weightKg === "" ? "" : data.weightKg}
            placeholder="kg"
            step={0.5}
            inputMode="decimal"
            onChange={(raw) =>
              onChange({ ...data, weightKg: raw === "" ? "" : parseFloat(raw) || 0 })
            }
            onStep={(delta) => {
              const cur = data.weightKg === "" || data.weightKg === 0 ? 0 : Number(data.weightKg);
              const next = Math.max(0, Math.min(9999, parseFloat((cur + delta).toFixed(1))));
              onChange({ ...data, weightKg: next });
            }}
          />
        )}
      </div>
    </div>
  );
}
