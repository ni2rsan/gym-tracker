"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import type { StreakData } from "@/lib/services/plannerService";
import type { PRRecord } from "@/types";
import type { MuscleGroup } from "@/types";
import { ExerciseIcon } from "@/components/workout/ExerciseIcon";
import { setSorryTokenMax } from "@/actions/planner";

// ─── Constants ───────────────────────────────────────────────────────────────

const SORRY_MAX_LIMIT = 5; // absolute ceiling
const MILESTONES = [10, 30, 50, 75, 100];
const MILESTONE_EMOJIS: Record<number, string> = {
  10: "🥉", 30: "🥈", 50: "🥇", 75: "💎", 100: "👑",
};

function getFooterText(generalStreak: number): string {
  const next = MILESTONES.find((m) => m > generalStreak);
  if (!next) return "You've conquered every milestone.";
  const diff = next - generalStreak;
  if (diff === 1) return `Just 1 more day to reach your ${next}-day milestone!`;
  return `Keep going — ${diff} days to your ${next}-day milestone`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

export function MilestonesCard({ generalStreak, bestStreak }: { generalStreak: number; bestStreak: number }) {
  const nextMilestone = MILESTONES.find((m) => m > generalStreak) ?? null;
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({});

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-100 dark:border-zinc-800">
      <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-3">
        Milestones
      </div>
      <div className="flex flex-wrap gap-3 justify-between">
        {MILESTONES.map((m) => {
          const unlocked = bestStreak >= m;
          const isNext = m === nextMilestone;
          const hasImgError = imgErrors[m];
          return (
            <div key={m} className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "w-32 h-32 flex items-center justify-center overflow-hidden transition-all",
                  !unlocked && "opacity-30 grayscale"
                )}
              >
                {!hasImgError ? (
                  <img
                    src={`/milestones/${m}.png`}
                    alt={`${m}d milestone`}
                    className="w-full h-full object-contain"
                    onError={() => setImgErrors(prev => ({ ...prev, [m]: true }))}
                  />
                ) : (
                  <span className="text-3xl">
                    {unlocked || isNext ? MILESTONE_EMOJIS[m] : "🔒"}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] font-bold",
                  unlocked ? "text-amber-600 dark:text-amber-400" : "text-zinc-400 dark:text-zinc-500"
                )}
              >
                {m}d
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const GROUP_META: Record<string, { label: string; color: string; dot: string }> = {
  UPPER_BODY:  { label: "Upper Body",  color: "text-blue-600 dark:text-blue-400",   dot: "bg-blue-400"   },
  LOWER_BODY:  { label: "Lower Body",  color: "text-green-600 dark:text-green-400", dot: "bg-green-400"  },
  BODYWEIGHT:  { label: "Bodyweight",  color: "text-purple-600 dark:text-purple-400", dot: "bg-purple-400" },
};

export function PRPanel({ prs }: { prs: PRRecord[] }) {
  if (prs.length === 0) return null;

  // Group by muscleGroup preserving order: UPPER_BODY, LOWER_BODY, BODYWEIGHT, then any others
  const ORDER = ["UPPER_BODY", "LOWER_BODY", "BODYWEIGHT"];
  const grouped: Record<string, PRRecord[]> = {};
  for (const pr of prs) {
    if (!grouped[pr.muscleGroup]) grouped[pr.muscleGroup] = [];
    grouped[pr.muscleGroup].push(pr);
  }
  const groups = [
    ...ORDER.filter(g => grouped[g]),
    ...Object.keys(grouped).filter(g => !ORDER.includes(g)),
  ];

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
        <span className="text-sm">🏆</span>
        <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
          Personal Records
        </span>
      </div>
      <div className="p-3 space-y-4">
        {groups.map((group) => {
          const meta = GROUP_META[group] ?? { label: group, color: "text-zinc-600 dark:text-zinc-400", dot: "bg-zinc-400" };
          return (
            <div key={group}>
              {/* Group header */}
              <div className="flex items-center gap-1.5 mb-2">
                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", meta.dot)} />
                <span className={cn("text-[10px] font-bold uppercase tracking-widest", meta.color)}>
                  {meta.label}
                </span>
              </div>
              {/* 4-column card grid */}
              <div className="grid grid-cols-4 gap-1.5">
                {grouped[group].map((pr) => {
                  return (
                    <div
                      key={pr.exerciseId}
                      className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-2 flex flex-col gap-0.5 min-w-0"
                    >
                      <div className="w-14 h-14 mb-0.5 shrink-0">
                        <ExerciseIcon name={pr.exerciseName} muscleGroup={pr.muscleGroup as MuscleGroup} className="w-14 h-14" />
                      </div>
                      <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 leading-tight line-clamp-2">
                        {pr.exerciseName}
                      </span>
                      <span className="text-xs font-black text-zinc-900 dark:text-white leading-tight tabular-nums">
                        {pr.muscleGroup === "BODYWEIGHT" || pr.maxWeightKg == null
                          ? `${pr.maxReps ?? pr.repsAtMaxWeight}r`
                          : `${Number(pr.maxWeightKg).toFixed(1)}kg`}
                      </span>
                      {pr.muscleGroup !== "BODYWEIGHT" && pr.maxWeightKg != null && (
                        <span className="text-[9px] text-zinc-400 dark:text-zinc-500 leading-none">
                          ×{pr.repsAtMaxWeight} reps
                        </span>
                      )}
                      <span className="text-[9px] text-zinc-400 dark:text-zinc-500 leading-none mt-auto pt-1">
                        {pr.achievedOn.slice(5).replace("-", "/")}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SorryTokens({ used, sorryMax }: { used: number; sorryMax: number }) {
  const remaining = Math.max(0, sorryMax - used);
  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-1.5">
        {Array.from({ length: sorryMax }, (_, i) => {
          const isUsed = i < used;
          return (
            <div
              key={i}
              className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center text-[9px] font-bold transition-all",
                isUsed
                  ? "border-zinc-400 bg-zinc-200 dark:border-zinc-600 dark:bg-zinc-700 text-zinc-400 dark:text-zinc-500"
                  : "border-amber-400 bg-amber-100 dark:border-amber-500 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400"
              )}
              title={isUsed ? "SORRY token used" : "SORRY token available"}
            >
              {isUsed ? "✗" : "S"}
            </div>
          );
        })}
      </div>
      <span className="text-xs text-amber-700/70 dark:text-amber-300/50 font-medium">
        {remaining} of {sorryMax} SORRY tokens left this month
      </span>
    </div>
  );
}

function FooterCard({
  generalStreak,
  sorryUsed,
  sorryMax,
  canEditSorryMax,
}: {
  generalStreak: number;
  sorryUsed: number;
  sorryMax: number;
  canEditSorryMax: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [localMax, setLocalMax] = useState(sorryMax);
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSave = () => {
    setErrorMsg(null);
    startTransition(async () => {
      const result = await setSorryTokenMax(localMax);
      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        setErrorMsg(result.error ?? "Failed to save.");
        setLocalMax(sorryMax);
      }
    });
  };

  return (
    <div className="bg-amber-50 dark:bg-zinc-900/80 rounded-2xl border border-amber-200 dark:border-amber-900/40 py-3 px-5 space-y-3">
      <p className="text-xs font-semibold text-amber-800/70 dark:text-amber-300/60 text-center">
        {getFooterText(generalStreak)}
      </p>
      <div className="flex justify-center">
        <SorryTokens used={sorryUsed} sorryMax={localMax} />
      </div>

      {/* SORRY token limit setter */}
      <div className="border-t border-amber-200 dark:border-amber-900/40 pt-3 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-amber-800/80 dark:text-amber-300/70">
            Monthly SORRY token limit
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLocalMax((v) => Math.max(1, v - 1))}
              disabled={!canEditSorryMax || localMax <= 1 || pending}
              className="w-6 h-6 rounded-md flex items-center justify-center text-sm font-bold border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 disabled:opacity-30 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
            >
              −
            </button>
            <span className="w-5 text-center text-sm font-black text-amber-900 dark:text-amber-200 tabular-nums">
              {localMax}
            </span>
            <button
              onClick={() => setLocalMax((v) => Math.min(SORRY_MAX_LIMIT, v + 1))}
              disabled={!canEditSorryMax || localMax >= SORRY_MAX_LIMIT || pending}
              className="w-6 h-6 rounded-md flex items-center justify-center text-sm font-bold border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 disabled:opacity-30 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
            >
              +
            </button>
            {canEditSorryMax && localMax !== sorryMax && (
              <button
                onClick={handleSave}
                disabled={pending}
                className="text-[10px] font-semibold px-2 py-1 rounded-md bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 transition-colors"
              >
                {pending ? "…" : "Save"}
              </button>
            )}
            {saved && (
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Saved ✓</span>
            )}
          </div>
        </div>
        {errorMsg && (
          <p className="text-[10px] text-red-500 dark:text-red-400">{errorMsg}</p>
        )}
        <p className="text-[10px] text-amber-700/60 dark:text-amber-400/50 leading-relaxed">
          {canEditSorryMax
            ? "Max 5 tokens per month. You can only change this once per calendar month."
            : "You've already changed your SORRY token limit this month. Come back next month to adjust it again."}
        </p>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

interface StreakCounterProps {
  streakData: StreakData;
  trackedGroupsByDate: Record<string, Set<string>>;
}

export function StreakCounter({ streakData }: StreakCounterProps) {
  const {
    generalStreak,
    sorryUsed,
    sorryMax,
    canEditSorryMax,
  } = streakData;

  return (
    <div className="mt-6 space-y-3">
      <FooterCard generalStreak={generalStreak} sorryUsed={sorryUsed} sorryMax={sorryMax} canEditSorryMax={canEditSorryMax} />
    </div>
  );
}
