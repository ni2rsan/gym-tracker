"use client";

import { useEffect, useState } from "react";
import { GuideModal, type GuideStep } from "./GuideModal";

const STORAGE_KEY = "gymtracker_guide_seen_reports";

/* ── Illustrations ── */

function WeightTrendIllustration() {
  const pts = [72.4, 72.1, 71.9, 72.2, 71.7, 71.4, 71.1, 71.3, 70.9, 70.6, 70.8, 70.4];
  const min = Math.min(...pts) - 0.5;
  const max = Math.max(...pts) + 0.5;
  const w = 220, h = 80;
  const toX = (i: number) => (i / (pts.length - 1)) * w;
  const toY = (v: number) => h - ((v - min) / (max - min)) * h;
  const polyline = pts.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");

  return (
    <div className="w-full max-w-[260px] rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden text-[9px] font-medium">
          {["30d","60d","90d"].map((v, i) => (
            <div key={v} className={`px-2 py-1 ${i === 0 ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "text-zinc-500"}`}>{v}</div>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-2 py-1 text-[9px] font-medium text-zinc-700 dark:text-zinc-200">Weight</div>
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-2 py-1 text-[9px] text-zinc-400">Body Fat</div>
        </div>
      </div>
      <div className="px-2 py-2">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: 70 }}>
          <defs>
            <linearGradient id="wgradR" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((pct) => (
            <line key={pct} x1="0" y1={h * pct} x2={w} y2={h * pct} stroke="#e4e4e7" strokeWidth="0.5" />
          ))}
          <polygon points={`0,${h} ${polyline} ${w},${h}`} fill="url(#wgradR)" />
          <polyline points={polyline} fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={toX(pts.length - 1)} cy={toY(pts[pts.length - 1])} r="3.5" fill="#10b981" />
        </svg>
        <div className="flex justify-between px-1">
          {["Mar 1", "Mar 8", "Mar 14"].map((l) => (
            <span key={l} className="text-[8px] text-zinc-400">{l}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ExerciseProgressIllustration() {
  const bars = [60, 65, 62, 70, 68, 75, 80];
  const maxBar = Math.max(...bars);
  return (
    <div className="w-full max-w-[260px] rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-2 py-1 text-[10px] text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
          <span>Bench Press</span>
          <span className="text-zinc-400">▾</span>
        </div>
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-2 py-1 text-[9px] text-zinc-400">90d</div>
      </div>
      <div className="px-3 py-2">
        <div className="flex items-end gap-1.5 h-16">
          {bars.map((v, i) => (
            <div key={i} className="flex-1 flex flex-col items-center justify-end">
              <div
                className={`w-full rounded-t-sm ${i === bars.length - 1 ? "bg-blue-500 animate-pulse" : "bg-blue-200 dark:bg-blue-900/40"}`}
                style={{ height: `${(v / maxBar) * 56}px` }}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-1">
          {["Feb","","","","","","Mar"].map((l, i) => (
            <span key={i} className="text-[7px] text-zinc-400 flex-1 text-center">{l}</span>
          ))}
        </div>
        <div className="mt-1 flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-[9px] text-zinc-500">Max: <span className="font-semibold text-zinc-900 dark:text-white">80 kg</span></span>
        </div>
      </div>
    </div>
  );
}

function WithingsIllustration() {
  return (
    <div className="w-full max-w-[240px] rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
        <div className="text-[10px] font-semibold text-zinc-900 dark:text-white">Withings Scale</div>
        <div className="text-[9px] text-zinc-400 mt-0.5">Sync your weight automatically</div>
      </div>
      <div className="px-4 py-3 flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="text-2xl">⚖️</div>
          <div className="flex flex-col">
            <span className="text-[10px] font-medium text-zinc-700 dark:text-zinc-300">Not connected</span>
            <span className="text-[9px] text-zinc-400">Connect to auto-import readings</span>
          </div>
        </div>
        <div className="w-full rounded-xl bg-emerald-500 py-2 text-center text-[11px] font-bold text-white animate-pulse">
          Connect Withings →
        </div>
        <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800 px-3 py-2 flex items-center gap-2 border border-zinc-100 dark:border-zinc-700">
          <span className="text-[8px] text-zinc-400">After connecting:</span>
          <div className="flex flex-col gap-0.5 ml-auto">
            <div className="flex items-center gap-1 text-[9px] text-zinc-600 dark:text-zinc-300">
              <span className="text-emerald-500">↓</span> 70.4 kg synced
            </div>
            <div className="text-[8px] text-zinc-400">Today, 07:42</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Exported steps ── */

export const reportsSteps: GuideStep[] = [
  {
    title: "Weight Trend",
    description: "Log your body weight from the Tracker page. The chart here shows your trend over 30, 60, or 90 days. Toggle Body Fat and Muscle Mass if you have a Withings scale connected.",
    illustration: <WeightTrendIllustration />,
  },
  {
    title: "Exercise Progress",
    description: "Pick any exercise from the dropdown to see your max weight lifted over time. Great for spotting plateaus and celebrating new bests.",
    illustration: <ExerciseProgressIllustration />,
  },
  {
    title: "Connect Withings",
    description: "Link your Withings smart scale to auto-import body weight, body fat %, and muscle mass. Readings sync automatically every time you open Reports.",
    illustration: <WithingsIllustration />,
  },
];

/* ── Auto-show component ── */

export function ReportsGuide() {
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
    <GuideModal open={open} onClose={handleClose} steps={reportsSteps} currentStep={step} onStepChange={setStep} />
  );
}
