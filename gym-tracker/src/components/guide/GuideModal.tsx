"use client";

import { useEffect } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface GuideStep {
  title: string;
  description: string;
  illustration: React.ReactNode;
}

interface GuideModalProps {
  open: boolean;
  onClose: () => void;
  steps: GuideStep[];
  currentStep: number;
  onStepChange: (step: number) => void;
  /** Override the fixed container z-index class. Default: "z-[60]" */
  zClass?: string;
}

export function GuideModal({ open, onClose, steps, currentStep, onStepChange, zClass = "z-[60]" }: GuideModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && currentStep < steps.length - 1) onStepChange(currentStep + 1);
      if (e.key === "ArrowLeft" && currentStep > 0) onStepChange(currentStep - 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose, currentStep, steps.length, onStepChange]);

  if (!open) return null;

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  return (
    <div className={`fixed inset-0 ${zClass} flex items-center justify-center`}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Panel */}
      <div
        className="relative z-10 w-full max-w-sm mx-4 rounded-2xl bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500">
            Step {currentStep + 1} of {steps.length}
          </span>
          <button
            onClick={onClose}
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            Skip guide
          </button>
        </div>

        {/* Illustration */}
        <div className="flex items-center justify-center px-5 py-6 min-h-[140px]">
          {step.illustration}
        </div>

        {/* Text */}
        <div className="px-5 pb-4">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-1.5">{step.title}</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{step.description}</p>
        </div>

        {/* Step dots */}
        <div className="flex items-center justify-center gap-1.5 pb-4">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => onStepChange(i)}
              className={cn(
                "rounded-full transition-all",
                i === currentStep
                  ? "w-5 h-2 bg-emerald-500"
                  : "w-2 h-2 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600"
              )}
              aria-label={`Go to step ${i + 1}`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-5 pb-5 gap-3">
          <button
            onClick={() => onStepChange(currentStep - 1)}
            disabled={currentStep === 0}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors",
              currentStep === 0
                ? "text-zinc-300 dark:text-zinc-700 cursor-not-allowed"
                : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            )}
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>

          <button
            onClick={() => {
              if (isLast) {
                onClose();
              } else {
                onStepChange(currentStep + 1);
              }
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors"
          >
            {isLast ? "Done" : (
              <>
                Next
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
