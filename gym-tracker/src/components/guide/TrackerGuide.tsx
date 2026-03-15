"use client";

import { useEffect, useState } from "react";
import { Pin, Trash2, Plus, Minus, ChevronDown, ChevronUp } from "lucide-react";
import { GuideModal, type GuideStep } from "./GuideModal";

const STORAGE_KEY = "gymtracker_guide_seen_tracker";

/* ── Illustrations (workout page only) ── */

function AddExerciseIllustration() {
  return (
    <div className="w-full max-w-[240px] flex flex-col gap-1.5">
      <div className="rounded-xl border border-blue-200 dark:border-blue-800/50 overflow-hidden">
        {/* Group header — matches ExerciseGroup exactly */}
        <div className="w-full flex items-center justify-between px-5 py-3.5 bg-blue-50 dark:bg-blue-950/20">
          <span className="flex items-center gap-2 text-xs font-semibold text-blue-500 dark:text-blue-400">
            Upper Body
            <span className="text-[10px] font-normal opacity-60">3 exercises</span>
          </span>
          <span className="flex items-center gap-1.5">
            {/* Add button — pulsing */}
            <span className="rounded-lg border border-current px-2 py-1 text-[10px] font-semibold flex items-center gap-1 text-blue-500 dark:text-blue-400 animate-pulse">
              <Plus className="h-3 w-3" />
              Add
            </span>
            <ChevronDown className="h-4 w-4 text-blue-500 dark:text-blue-400" />
          </span>
        </div>
        {/* Dropdown panel (AddCustomExercise modal preview) */}
        <div className="border-t border-blue-100 dark:border-blue-800/30 bg-white dark:bg-zinc-900 px-2 py-1.5">
          <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800 px-2 py-1 text-[9px] text-zinc-400 border border-zinc-200 dark:border-zinc-700 mb-1">
            Custom exercise name
          </div>
          {["BENCH PRESS", "LAT PULLDOWN", "SHOULDER PRESS"].map((e) => (
            <div key={e} className="flex items-center gap-1.5 px-1.5 py-1 rounded-md">
              <div className="w-5 h-5 rounded-md bg-zinc-100 dark:bg-zinc-700 overflow-hidden flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/exercises/${e}.png`} alt={e} className="w-full h-full object-contain" />
              </div>
              <span className="text-[9px] text-zinc-700 dark:text-zinc-300">{e}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RemoveExerciseIllustration() {
  return (
    <div className="w-full max-w-[220px]">
      {/* ExerciseCard replica */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 shadow-sm">
        {/* Card header — matches ExerciseCard exactly */}
        <div className="flex items-center gap-2 mb-2.5">
          <div className="h-8 w-8 shrink-0 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/exercises/BENCH PRESS.png" alt="BENCH PRESS" className="w-full h-full object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-zinc-900 dark:text-white leading-tight">BENCH PRESS</div>
            <span className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/30 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">Compound</span>
          </div>
          {/* Pin button */}
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-400">
            <Pin className="h-3.5 w-3.5" />
          </div>
          {/* Trash button — highlighted */}
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-50 dark:bg-red-950/30 text-red-500 dark:text-red-400 animate-bounce">
            <Trash2 className="h-3.5 w-3.5" />
          </div>
        </div>
        {/* Set rows */}
        <div className="flex items-center gap-1.5 mb-1 text-[9px] text-zinc-400">
          <span className="w-8">Set</span>
          <span className="flex-1 text-center">Reps</span>
          <span className="flex-1 text-center">kg</span>
        </div>
        {[["1","10","80"],["2","8","85"]].map(([s,r,w]) => (
          <div key={s} className="flex items-center gap-1.5 mb-1">
            <span className="w-8 text-[9px] text-zinc-400">{s}</span>
            <div className="flex-1 h-6 rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-[9px] text-zinc-600 dark:text-zinc-300">{r}</div>
            <div className="flex-1 h-6 rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-[9px] text-zinc-600 dark:text-zinc-300">{w}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SetCountIllustration() {
  return (
    <div className="w-full max-w-[220px]">
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 shadow-sm">
        {/* Card header */}
        <div className="flex items-center gap-2 mb-2">
          <div className="h-8 w-8 shrink-0 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/exercises/SQUAT.png" alt="SQUAT" className="w-full h-full object-contain" />
          </div>
          <div className="flex-1">
            <div className="text-xs font-semibold text-zinc-900 dark:text-white leading-tight">SQUAT</div>
            <span className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/30 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">Compound</span>
          </div>
          {/* Tracked checkmark */}
          <span className="w-5 h-5 rounded-full bg-amber-500 ring-2 ring-amber-300 flex items-center justify-center shrink-0">
            <span className="text-white font-black leading-none" style={{ fontSize: "9px" }}>✓</span>
          </span>
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-400">
            <Pin className="h-3.5 w-3.5" />
          </div>
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-400">
            <Trash2 className="h-3.5 w-3.5" />
          </div>
        </div>
        {/* +Set / −Set bar — matches ExerciseCard footer */}
        <div className="flex items-center gap-1.5 mb-2.5">
          <button className="flex items-center gap-0.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-500">
            <Minus className="h-2.5 w-2.5" /> Set
          </button>
          <button className="flex items-center gap-0.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-0.5 text-[10px] text-emerald-600 font-semibold animate-pulse">
            <Plus className="h-2.5 w-2.5" /> Set
          </button>
          <button className="ml-auto rounded-md border border-zinc-200 dark:border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-400">Edit</button>
        </div>
        {/* Set rows */}
        <div className="flex items-center gap-1.5 mb-1 text-[9px] text-zinc-400">
          <span className="w-8">Set</span>
          <span className="flex-1 text-center">Reps</span>
          <span className="flex-1 text-center">kg</span>
        </div>
        {[["1","8","100"],["2","8","100"],["3","6","105"]].map(([s,r,w]) => (
          <div key={s} className="flex items-center gap-1.5 mb-1">
            <span className="w-8 text-[9px] text-zinc-400">{s}</span>
            <div className="flex-1 h-6 rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-[9px] text-zinc-600 dark:text-zinc-300">{r}</div>
            <div className="flex-1 h-6 rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-[9px] text-zinc-600 dark:text-zinc-300">{w}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Exported steps ── */

export const trackerPageSteps: GuideStep[] = [
  {
    title: "Add Exercises",
    description: "Tap 'Add' inside any muscle group header to search and add exercises to today's workout. Your selections are saved and pre-fill next time.",
    illustration: <AddExerciseIllustration />,
  },
  {
    title: "Remove an Exercise",
    description: "Open any exercise card and tap the red trash icon to remove it from today's workout. This only affects today — it won't delete it permanently.",
    illustration: <RemoveExerciseIllustration />,
  },
  {
    title: "Adjust Set Count",
    description: "Use '+Set' and '−Set' in the tracked bar to add or remove sets. Your preferred count is saved and pre-filled the next time you add this exercise.",
    illustration: <SetCountIllustration />,
  },
];

/* ── Auto-show component ── */

export function TrackerGuide() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("section")) return; // entered via Track Mode from planner, not the workout page directly
    if (!localStorage.getItem(STORAGE_KEY)) setOpen(true);
  }, []);

  function handleClose() {
    setOpen(false);
    localStorage.setItem(STORAGE_KEY, "1");
  }

  return (
    <GuideModal open={open} onClose={handleClose} steps={trackerPageSteps} currentStep={step} onStepChange={setStep} />
  );
}
