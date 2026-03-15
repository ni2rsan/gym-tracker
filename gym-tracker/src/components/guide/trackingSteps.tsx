"use client";

import { ExerciseIcon } from "@/components/workout/ExerciseIcon";
import type { GuideStep } from "./GuideModal";

/* ─── Icon Grid Guide illustrations ─── */

function IconGridIllustration() {
  // Real exercise data matching what the app renders
  const exercises: { name: string; muscleGroup: "UPPER_BODY" | "LOWER_BODY" | "BODYWEIGHT" | "CARDIO"; done: boolean }[] = [
    { name: "BENCH PRESS",            muscleGroup: "UPPER_BODY", done: true },
    { name: "LAT PULLDOWN",           muscleGroup: "UPPER_BODY", done: false },
    { name: "SHOULDER PRESS",         muscleGroup: "UPPER_BODY", done: false },
    { name: "TRICEPS PUSHDOWN",       muscleGroup: "UPPER_BODY", done: false },
    { name: "BICEPS CURL (MACHINE)",  muscleGroup: "UPPER_BODY", done: false },
    { name: "CABLE ROW",              muscleGroup: "UPPER_BODY", done: false },
  ];

  return (
    <div className="w-full max-w-[260px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <div className="flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-700 px-2 py-1 text-[9px] text-zinc-600 dark:text-zinc-300">
          ← Back
        </div>
        <div className="text-center">
          <p className="text-[7px] text-zinc-400 uppercase tracking-wide font-medium">Tracking Mode</p>
          <p className="text-[9px] font-semibold text-zinc-900 dark:text-white">Upper Body</p>
        </div>
        <div className="flex items-center gap-1 text-[9px] text-zinc-400">
          ? &nbsp; ✕ Exit
        </div>
      </div>
      {/* Automated tracking bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
        <span className="text-[9px] font-medium text-zinc-600 dark:text-zinc-400">Automated Tracking</span>
        <div className="relative inline-flex h-4 w-7 items-center rounded-full bg-zinc-300 dark:bg-zinc-600">
          <div className="inline-block h-3 w-3 translate-x-0.5 rounded-full bg-white shadow" />
        </div>
        <span className="text-[8px] text-zinc-400 ml-auto">Break</span>
        <div className="rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-1.5 py-0.5 text-[8px] text-zinc-500">2:00 ▾</div>
      </div>
      {/* Icon grid */}
      <div className="grid grid-cols-3 gap-x-3 gap-y-3 p-3">
        {exercises.map(({ name, muscleGroup, done }) => (
          <div key={name} className="flex flex-col items-center gap-1">
            <div className={`relative w-11 h-11 rounded-full flex items-center justify-center ${done ? "bg-amber-100 dark:bg-amber-900/50" : "bg-zinc-100 dark:bg-zinc-800 ring-2 ring-zinc-200 dark:ring-zinc-700"}`}>
              <ExerciseIcon name={name} muscleGroup={muscleGroup} className="h-5 w-5" />
              {done && (
                <div className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-950 flex items-center justify-center text-[7px] font-black text-white">✓</div>
              )}
            </div>
            <span className={`text-[7px] font-medium text-center leading-tight line-clamp-2 w-full ${done ? "text-amber-700 dark:text-amber-400" : "text-zinc-500 dark:text-zinc-400"}`}>
              {name.charAt(0) + name.slice(1).toLowerCase()}
            </span>
          </div>
        ))}
      </div>
      {/* Finish */}
      <div className="px-3 pb-3">
        <div className="w-full rounded-xl bg-emerald-500 py-1.5 text-center text-[9px] font-bold text-white">Finish</div>
      </div>
    </div>
  );
}

function IconDoneIllustration() {
  return (
    <div className="flex flex-col items-center gap-3">
      {/* Before / After side by side */}
      <div className="flex items-center gap-5">
        <div className="flex flex-col items-center gap-1.5">
          <div className="relative w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-800 ring-2 ring-zinc-200 dark:ring-zinc-700 flex items-center justify-center">
            <ExerciseIcon name="BENCH PRESS" muscleGroup="UPPER_BODY" className="h-7 w-7" />
          </div>
          <span className="text-[8px] text-zinc-400">Tap to log</span>
        </div>
        <span className="text-lg text-zinc-400">→</span>
        <div className="flex flex-col items-center gap-1.5">
          <div className="relative w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center animate-pulse">
            <ExerciseIcon name="BENCH PRESS" muscleGroup="UPPER_BODY" className="h-7 w-7" />
            <div className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-950 flex items-center justify-center text-[9px] font-black text-white">✓</div>
          </div>
          <span className="text-[8px] text-emerald-600 dark:text-emerald-400 font-medium">Done!</span>
        </div>
      </div>
      {/* Tap-done-icon → summary popup */}
      <div className="w-52 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
        <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
          <ExerciseIcon name="BENCH PRESS" muscleGroup="UPPER_BODY" className="h-4 w-4" />
          <span className="text-[10px] font-semibold text-zinc-900 dark:text-white">Bench Press</span>
        </div>
        <div className="px-3 py-1.5 space-y-1">
          {[["S1","10 reps · 80 kg"],["S2","8 reps · 85 kg"]].map(([s, d]) => (
            <div key={s} className="flex items-center gap-2 text-[9px]">
              <span className="w-6 text-zinc-400">{s}</span>
              <span className="text-zinc-700 dark:text-zinc-300">{d}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2 px-3 pb-2">
          <div className="flex-1 rounded-lg border border-red-200 dark:border-red-800 py-1 text-[9px] font-semibold text-red-600 text-center">Delete</div>
          <div className="flex-1 rounded-lg bg-emerald-500 py-1 text-[9px] font-semibold text-white text-center">Re-track</div>
        </div>
      </div>
    </div>
  );
}

/* ─── Exercise Detail Guide illustrations ─── */

function ExerciseDetailIllustration() {
  return (
    <div className="w-full max-w-[230px] flex flex-col items-center gap-2">
      {/* Header */}
      <div className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <div className="w-7 h-7 rounded-lg border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-[10px] text-zinc-500">←</div>
        <div className="flex-1 min-w-0">
          <p className="text-[7px] text-zinc-400 uppercase font-medium tracking-wide">Upper Body</p>
          <p className="text-[9px] font-semibold text-zinc-900 dark:text-white truncate">Lat Pulldown</p>
        </div>
        <div className="flex items-center gap-0.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[9px] text-zinc-400 font-semibold">?</div>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[9px] text-zinc-400">✕</div>
        </div>
      </div>
      {/* Big icon */}
      <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 ring-2 ring-zinc-200 dark:ring-zinc-700 flex items-center justify-center">
        <ExerciseIcon name="LAT PULLDOWN" muscleGroup="UPPER_BODY" className="h-8 w-8" />
      </div>
      <div className="text-center">
        <p className="text-xs font-bold text-zinc-900 dark:text-white">Lat Pulldown</p>
        <p className="text-[9px] font-semibold text-blue-500 uppercase tracking-wide">Upper Body</p>
      </div>
      {/* Set rows */}
      <div className="w-full space-y-1">
        <div className="flex items-center gap-1.5 mb-1 text-[8px] text-zinc-400 px-1">
          <span className="w-8 text-center">Set</span>
          <span className="flex-1 text-center">Reps</span>
          <span className="flex-1 text-center">kg</span>
          <div className="rounded border border-zinc-200 dark:border-zinc-700 px-1.5 py-0.5 text-[8px] text-zinc-500">Edit</div>
        </div>
        {[["1","12","60"],["2","10","65"],["3","8","70"]].map(([s,r,w]) => (
          <div key={s} className="flex items-center gap-1.5 px-1">
            <span className="w-8 text-center text-[8px] text-zinc-400">S{s}</span>
            <div className="flex-1 h-6 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-[8px] text-zinc-700 dark:text-zinc-300">{r}</div>
            <div className="flex-1 h-6 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-[8px] text-zinc-700 dark:text-zinc-300">{w}</div>
            <div className="w-10" />
          </div>
        ))}
      </div>
      {/* Next button */}
      <div className="w-full rounded-xl bg-emerald-500 py-2 text-center text-[10px] font-bold text-white">Next →</div>
    </div>
  );
}

function AutoTrackDetailIllustration() {
  return (
    <div className="w-full max-w-[240px] flex flex-col gap-2">
      {/* Auto toggle bar */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700">
        <span className="text-[10px] font-medium text-zinc-600 dark:text-zinc-400">Automated</span>
        <div className="relative inline-flex h-5 w-9 items-center rounded-full bg-emerald-500">
          <div className="inline-block h-4 w-4 translate-x-4 rounded-full bg-white shadow" />
        </div>
        <span className="text-[10px] text-zinc-400 ml-auto">Break:</span>
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-700 dark:text-zinc-300">90s ▾</div>
      </div>
      {/* Set rows with active + timer */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-zinc-100 dark:border-zinc-800 text-[8px] text-zinc-400">
          <span className="w-8" /><span className="flex-1 text-center">Reps</span><span className="flex-1 text-center">kg</span><span className="w-14" />
        </div>
        {/* Done row */}
        <div className="flex items-center gap-1.5 px-3 py-1 text-[9px] text-zinc-400">
          <span className="w-8 text-center text-emerald-500 font-bold">✓</span>
          <div className="flex-1 h-5 rounded bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center text-zinc-400">12</div>
          <div className="flex-1 h-5 rounded bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center text-zinc-400">60</div>
          <div className="w-14" />
        </div>
        {/* Timer row */}
        <div className="flex items-center gap-1.5 px-3 py-1 text-[9px]">
          <span className="w-8" />
          <span className="flex-1 text-center font-mono text-emerald-600 dark:text-emerald-400 text-xs">0:43</span>
          <span className="text-[9px] text-zinc-400 underline cursor-pointer">Skip</span>
          <div className="w-6" />
        </div>
        {/* Active row */}
        <div className="mx-2 mb-1 flex items-center gap-1.5 px-2 py-1 ring-2 ring-emerald-400 dark:ring-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg">
          <div className="w-8 shrink-0 rounded-md bg-emerald-500 py-0.5 text-[8px] font-bold text-white text-center">Done</div>
          <div className="flex-1 h-5 rounded bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center text-[8px]">10</div>
          <div className="flex-1 h-5 rounded bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center text-[8px]">65</div>
          <div className="w-10" />
        </div>
        {/* Pending row */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 opacity-40">
          <span className="w-8 text-center text-[8px] text-zinc-400">S3</span>
          <div className="flex-1 h-5 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-[8px]">8</div>
          <div className="flex-1 h-5 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-[8px]">70</div>
          <div className="w-10" />
        </div>
      </div>
    </div>
  );
}

/* ─── Exported step arrays ─── */

export const trackingIconSteps: GuideStep[] = [
  {
    title: "Exercise Icon Grid",
    description:
      "Each circle is an exercise in your session. The 'Automated Tracking' toggle (top bar) starts a rest timer automatically after each set. Tap an exercise to start logging.",
    illustration: <IconGridIllustration />,
  },
  {
    title: "Completing Exercises",
    description:
      "Once all sets are saved, the icon turns amber with a ✓ badge. Tap a completed icon to review your sets, delete the tracking, or re-track it from scratch.",
    illustration: <IconDoneIllustration />,
  },
];

export const trackingExerciseSteps: GuideStep[] = [
  {
    title: "Log Your Sets",
    description:
      "Tap 'Edit' to enter values, then fill in reps and kg for each set. When finished, tap 'Next' to save and return to the icon grid. Use '← Back' to go back without saving.",
    illustration: <ExerciseDetailIllustration />,
  },
  {
    title: "Automated Rest Timer",
    description:
      "Toggle 'Automated' on to auto-start a rest timer after each set. Tap 'Done' when the set is complete — the timer counts down, then advances to the next set automatically.",
    illustration: <AutoTrackDetailIllustration />,
  },
];
