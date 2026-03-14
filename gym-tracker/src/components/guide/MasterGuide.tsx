"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { plannerSteps } from "./PlannerGuide";
import { trackerPageSteps } from "./TrackerGuide";
import { reportsSteps } from "./ReportsGuide";
import { trackingIconSteps, trackingExerciseSteps } from "./trackingSteps";

type Tab = "planner" | "tracker" | "reports";

const TABS: { id: Tab; label: string }[] = [
  { id: "planner", label: "Planner" },
  { id: "tracker", label: "Tracker" },
  { id: "reports", label: "Reports" },
];

const trackerSteps = [...trackerPageSteps, ...trackingIconSteps, ...trackingExerciseSteps];

const ALL_STEPS: Record<Tab, typeof plannerSteps> = {
  planner: plannerSteps,
  tracker: trackerSteps,
  reports: reportsSteps,
};

function pathnameToTab(pathname: string): Tab {
  if (pathname.startsWith("/planner")) return "planner";
  if (pathname.startsWith("/reports")) return "reports";
  return "tracker"; // /workout and everything else
}

export function MasterGuide() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>(() => pathnameToTab(pathname));
  const [step, setStep] = useState(0);

  useEffect(() => {
    const handler = () => {
      setTab(pathnameToTab(pathname));
      setStep(0);
      setOpen(true);
    };
    window.addEventListener("gymtracker:open-guide", handler);
    return () => window.removeEventListener("gymtracker:open-guide", handler);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowRight") {
        const steps = ALL_STEPS[tab];
        if (step < steps.length - 1) setStep((s) => s + 1);
      }
      if (e.key === "ArrowLeft" && step > 0) setStep((s) => s - 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, tab, step]);

  function switchTab(newTab: Tab) {
    setTab(newTab);
    setStep(0);
  }

  if (!open) return null;

  const steps = ALL_STEPS[tab];
  const currentStepData = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} aria-hidden="true" />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-sm mx-4 rounded-2xl bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden" role="dialog" aria-modal="true">
        {/* Tab bar */}
        <div className="flex items-center border-b border-zinc-100 dark:border-zinc-800">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => switchTab(id)}
              className={cn(
                "flex-1 py-2.5 text-xs font-semibold transition-colors",
                tab === id
                  ? "text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500 -mb-px"
                  : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"
              )}
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => setOpen(false)}
            className="flex h-8 w-8 items-center justify-center mr-2 rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step count */}
        <div className="px-5 pt-3 pb-0">
          <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500">
            Step {step + 1} of {steps.length}
          </span>
        </div>

        {/* Illustration */}
        <div className="flex items-center justify-center px-5 py-4 min-h-[140px]">
          {currentStepData.illustration}
        </div>

        {/* Text */}
        <div className="px-5 pb-3">
          <h2 className="text-base font-bold text-zinc-900 dark:text-white mb-1">{currentStepData.title}</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{currentStepData.description}</p>
        </div>

        {/* Step dots */}
        <div className="flex items-center justify-center gap-1.5 pb-3">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={cn(
                "rounded-full transition-all",
                i === step ? "w-5 h-2 bg-emerald-500" : "w-2 h-2 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600"
              )}
              aria-label={`Go to step ${i + 1}`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-5 pb-5 gap-3">
          <button
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors",
              step === 0
                ? "text-zinc-300 dark:text-zinc-700 cursor-not-allowed"
                : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            )}
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>

          <button
            onClick={() => {
              if (isLast) setOpen(false);
              else setStep((s) => s + 1);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors"
          >
            {isLast ? "Done" : (<>Next <ChevronRight className="h-4 w-4" /></>)}
          </button>
        </div>
      </div>
    </div>
  );
}
