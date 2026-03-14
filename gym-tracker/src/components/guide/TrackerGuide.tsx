"use client";

import { useEffect, useState } from "react";
import { GuideModal, type GuideStep } from "./GuideModal";

const STORAGE_KEY = "gymtracker_guide_seen_tracker";

/* ── Illustrations (workout page only) ── */

function AddExerciseIllustration() {
  return (
    <div className="w-full max-w-[240px] flex flex-col gap-1.5">
      <div className="rounded-xl border border-blue-200 dark:border-blue-800/50 overflow-hidden">
        <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-950/20 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-blue-500">Upper Body</span>
            <span className="text-[10px] text-blue-400/60">3 exercises</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 rounded-md border border-blue-400 bg-white dark:bg-zinc-900 px-2 py-0.5 animate-pulse">
              <span className="text-[10px] font-bold text-blue-500">+ Add</span>
            </div>
          </div>
        </div>
        <div className="border-t border-blue-100 dark:border-blue-800/30 bg-white dark:bg-zinc-900 px-2 py-1.5">
          <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800 px-2 py-1 text-[9px] text-zinc-400 border border-zinc-200 dark:border-zinc-700 mb-1">
            Search exercises…
          </div>
          {["Bench Press", "Lat Pulldown", "Shoulder Press"].map((e) => (
            <div key={e} className="flex items-center gap-1.5 px-1.5 py-1 rounded-md">
              <div className="w-5 h-5 rounded-md bg-zinc-100 dark:bg-zinc-700" />
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
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 shadow-sm">
        <div className="flex items-center gap-2 mb-2.5">
          <div className="h-8 w-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-base">🏋️</div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-zinc-900 dark:text-white">Bench Press</div>
          </div>
          <div className="h-7 w-7 rounded-lg text-zinc-300 dark:text-zinc-600 flex items-center justify-center text-sm">☆</div>
          <div className="h-7 w-7 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center justify-center animate-bounce">
            <span className="text-[11px] text-red-500">🗑</span>
          </div>
        </div>
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
        <div className="flex items-center gap-2 mb-2">
          <div className="h-8 w-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-base">🦵</div>
          <div className="flex-1 text-xs font-semibold text-zinc-900 dark:text-white">Squat</div>
          <div className="w-5 h-5 rounded-full bg-amber-500 ring-2 ring-amber-300 flex items-center justify-center text-[9px] font-black text-white">✓</div>
        </div>
        {/* Tracked bar with +/-Set */}
        <div className="flex items-center gap-1.5 mb-2.5">
          <div className="flex items-center gap-0.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-500">
            − Set
          </div>
          <div className="flex items-center gap-0.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-0.5 text-[10px] text-emerald-600 font-semibold animate-pulse">
            + Set
          </div>
          <div className="ml-auto rounded-md border border-zinc-200 dark:border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-400">Edit</div>
        </div>
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
