"use client";

import { useEffect, useState } from "react";
import { GuideModal, type GuideStep } from "./GuideModal";

const STORAGE_KEY = "gymtracker_guide_seen";

/* ── Illustrations ── */

function CalendarIllustration() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const dots: Record<number, string[]> = {
    0: ["bg-blue-400"],
    2: ["bg-blue-400", "bg-rose-400"],
    4: ["bg-green-400"],
    7: ["bg-purple-400"],
    9: ["bg-blue-400"],
    11: ["bg-rose-400"],
    14: ["bg-green-400"],
    16: ["bg-blue-400"],
    18: ["bg-purple-400"],
  };
  return (
    <div className="w-full max-w-[260px] rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
      <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
        {days.map((d) => (
          <div key={d} className="py-1.5 text-center text-[9px] font-medium text-zinc-500 dark:text-zinc-400">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {Array.from({ length: 21 }).map((_, i) => {
          const isToday = i === 9;
          return (
            <div key={i} className={`h-9 p-0.5 flex flex-col items-center border-r border-b border-zinc-100 dark:border-zinc-800/50 ${isToday ? "border border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10" : ""}`}>
              <span className={`text-[9px] font-medium self-start ml-0.5 ${isToday ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-zinc-500 dark:text-zinc-400"}`}>{i + 1}</span>
              <div className="flex gap-px flex-wrap justify-center mt-px">
                {(dots[i] ?? []).map((cls, di) => (
                  <div key={di} className={`w-2 h-2 rounded-full ${cls}`} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-2 px-2 py-1.5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 flex-wrap">
        {[["bg-blue-400","Upper"], ["bg-green-400","Lower"], ["bg-purple-400","BW"], ["bg-rose-400","Cardio"]].map(([cls, label]) => (
          <span key={label} className="flex items-center gap-1 text-[8px] text-zinc-500">
            <span className={`w-2 h-2 rounded-full ${cls}`} />{label}
          </span>
        ))}
      </div>
    </div>
  );
}

function ContextMenuIllustration() {
  return (
    <div className="w-56 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
        <span className="text-[10px] text-zinc-500">Friday, Mar 14</span>
        <span className="text-[10px] text-emerald-500 font-medium">✓ Tracked</span>
      </div>
      <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex gap-1.5">
          {[
            { label: "Upper", cls: "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300" },
            { label: "Lower", cls: "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300" },
            { label: "Cardio", cls: "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300" },
          ].map(({ label, cls }) => (
            <span key={label} className={`rounded-full border px-2 py-0.5 text-[9px] font-medium ${cls}`}>{label}</span>
          ))}
        </div>
      </div>
      {[
        { text: "Open in Tracker", color: "text-emerald-600 dark:text-emerald-400 font-bold" },
        { text: "Change Block Type", color: "text-zinc-600 dark:text-zinc-300" },
        { text: "Delete Series", color: "text-red-500" },
      ].map(({ text, color }) => (
        <div key={text} className={`px-3 py-2 text-[10px] border-b border-zinc-50 dark:border-zinc-800/50 ${color}`}>{text}</div>
      ))}
    </div>
  );
}

function SorryTokenIllustration() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-zinc-900/80 px-5 py-3 flex flex-col items-center gap-2">
        <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Sorry Tokens</span>
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`w-7 h-7 rounded-full border-2 flex items-center justify-center font-bold text-xs ${i < 2 ? "border-amber-400 bg-amber-100 dark:border-amber-500 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400" : "border-zinc-300 bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-700 text-zinc-400"}`}>
              {i < 2 ? "S" : "✗"}
            </div>
          ))}
        </div>
        <span className="text-[10px] text-amber-700/70 dark:text-amber-300/50 font-medium">2 remaining this month</span>
      </div>
      <div className="w-52 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
        <div className="px-3 py-1.5 border-b border-zinc-100 dark:border-zinc-800">
          <span className="text-[9px] text-zinc-500">Monday, Mar 10 · Missed</span>
        </div>
        <div className="px-3 py-2 flex items-center gap-2 text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
          <div className="w-4 h-4 rounded-full border-2 border-amber-400 bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-[7px] font-bold text-amber-700">S</div>
          Use Sorry Token — Keep Streak
        </div>
      </div>
    </div>
  );
}

function ViewSwitcherIllustration() {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden text-[10px] font-medium">
        {["Month", "Week", "Year", "All"].map((v, i) => (
          <div key={v} className={`px-2.5 py-1.5 ${i === 0 ? "bg-emerald-500 text-white" : "text-zinc-600 dark:text-zinc-300"}`}>{v}</div>
        ))}
      </div>
      <div className="flex gap-4">
        {[
          { label: "Week", cols: 7, rows: 1, active: [0, 2, 4] },
          { label: "Month", cols: 7, rows: 4, active: [1, 5, 8, 12, 15, 20, 22] },
          { label: "Year", cols: 13, rows: 4, active: [0, 3, 7, 12, 15, 20, 24, 30] },
        ].map(({ label, cols, rows, active }) => (
          <div key={label} className="flex flex-col items-center gap-1.5">
            <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
              {Array.from({ length: cols * rows }).map((_, i) => (
                <div key={i} className={`w-2 h-2 rounded-sm ${active.includes(i) ? (i % 2 === 0 ? "bg-emerald-400" : "bg-blue-400") : "bg-zinc-100 dark:bg-zinc-800"}`} />
              ))}
            </div>
            <span className="text-[8px] text-zinc-400">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StreakIllustration() {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-700 via-slate-800 to-zinc-900 p-4 w-56">
      <div className="flex items-center gap-3">
        <div className="relative w-16 h-16 shrink-0">
          <svg className="-rotate-90 w-full h-full" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5" />
            <circle cx="32" cy="32" r="26" fill="none" stroke="#f59e0b" strokeWidth="5"
              strokeDasharray={`${2 * Math.PI * 26 * 0.72} ${2 * Math.PI * 26 * 0.28}`} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-black text-white leading-none">18</span>
            <span className="text-[7px] font-bold text-amber-400 uppercase tracking-widest">days</span>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-white/90">On fire! 🔥</span>
          <div className="grid grid-cols-2 gap-1 bg-white/10 rounded-lg px-2 py-1.5">
            <div><span className="text-sm font-black text-white block">18</span><span className="text-[8px] text-white/50 uppercase">Current</span></div>
            <div><span className="text-sm font-black text-white block">24</span><span className="text-[8px] text-white/50 uppercase">Best</span></div>
          </div>
        </div>
      </div>
      <div className="mt-3 flex justify-between px-1">
        {["M","T","W","T","F","S","S"].map((d, i) => (
          <div key={i} className="flex flex-col items-center gap-0.5">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold ${i < 4 ? "bg-amber-500 ring-1 ring-amber-300 text-white" : i === 4 ? "border-2 border-amber-400 bg-amber-50/10 text-amber-300" : "border border-zinc-600 text-zinc-600"}`}>
              {i < 4 ? "✓" : ""}
            </div>
            <span className="text-[7px] text-white/40">{d}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PRIllustration() {
  const prs = [
    { name: "Bench Press", val: "80kg", reps: "3×80kg", date: "Mar 14", isNew: true },
    { name: "Squat", val: "100kg", reps: "5×100kg", date: "Mar 10", isNew: false },
    { name: "Deadlift", val: "120kg", reps: "3×120kg", date: "Mar 7", isNew: false },
    { name: "Pull-up", val: "BW+20", reps: "8 reps", date: "Mar 3", isNew: false },
  ];
  return (
    <div className="w-full max-w-[260px] rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
        <div className="w-2 h-2 rounded-full bg-blue-400" />
        <span className="text-[9px] font-black uppercase tracking-wide text-zinc-700 dark:text-zinc-200">🏆 Personal Records · Upper Body</span>
      </div>
      <div className="grid grid-cols-2 gap-1.5 p-2">
        {prs.map(({ name, val, reps, date, isNew }) => (
          <div key={name} className={`rounded-xl p-2 ${isNew ? "bg-amber-50 dark:bg-amber-900/20 ring-1 ring-amber-200 dark:ring-amber-800" : "bg-zinc-50 dark:bg-zinc-800"}`}>
            <div className="flex items-start justify-between gap-1 mb-0.5">
              <span className="text-amber-400 text-[10px]">★</span>
              {isNew && <span className="text-[7px] font-black text-amber-500 uppercase">NEW!</span>}
            </div>
            <div className="text-[9px] font-medium text-zinc-700 dark:text-zinc-300 leading-tight">{name}</div>
            <div className="text-[11px] font-black text-zinc-900 dark:text-white">{val}</div>
            <div className="text-[8px] text-zinc-400">{reps}</div>
            <div className="text-[8px] text-zinc-400">{date}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Exported steps (used by MasterGuide too) ── */

export const plannerSteps: GuideStep[] = [
  {
    title: "Plan Your Training Calendar",
    description: "Tap any day to open it. Choose a block type (Upper Body, Lower Body, Cardio…) to schedule it. Colored dots show what you planned for each day.",
    illustration: <CalendarIllustration />,
  },
  {
    title: "Manage a Day",
    description: "Click any planned day to get options: open it in the Tracker, switch the block type, or delete the series. A ✓ badge shows if the workout was already tracked.",
    illustration: <ContextMenuIllustration />,
  },
  {
    title: "Sorry Tokens",
    description: "You get 3 Sorry Tokens per month. If you miss a day and would lose your streak, spend a token to excuse the miss and keep your streak alive.",
    illustration: <SorryTokenIllustration />,
  },
  {
    title: "Switch Calendar Views",
    description: "Use Month / Week / Year / All to zoom in or out on your training history. Each view shows your planned and completed workouts with colored dots.",
    illustration: <ViewSwitcherIllustration />,
  },
  {
    title: "Build Your Streak",
    description: "Your streak grows every consecutive day you complete a workout. See your current streak, all-time best, and this week's activity in the Streak panel below the calendar.",
    illustration: <StreakIllustration />,
  },
  {
    title: "Personal Records",
    description: "Your all-time personal bests are tracked automatically per exercise. A ★ highlights each PR card, and a NEW! badge appears whenever you set a fresh record.",
    illustration: <PRIllustration />,
  },
];

/* ── Auto-show component ── */

export function PlannerGuide() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(STORAGE_KEY)) setOpen(true);
  }, []);

  function handleClose() {
    setOpen(false);
    localStorage.setItem(STORAGE_KEY, "1");
  }

  return (
    <GuideModal open={open} onClose={handleClose} steps={plannerSteps} currentStep={step} onStepChange={setStep} />
  );
}
