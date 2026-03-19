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

// ─── Helpers ─────────────────────────────────────────────────────────────────

const RADIUS = 44;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function getSvgRingParams(generalStreak: number) {
  const nextMilestone = MILESTONES.find((m) => m > generalStreak) ?? null;
  const prevMilestone = [...MILESTONES].reverse().find((m) => m <= generalStreak) ?? 0;
  const ringProgress = nextMilestone
    ? (generalStreak - prevMilestone) / (nextMilestone - prevMilestone)
    : 1;
  const offset = CIRCUMFERENCE * (1 - ringProgress);
  return { nextMilestone, prevMilestone, ringProgress, offset };
}

function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function buildHeatmapDays(last30DaysWorkouts: string[]) {
  const workedSet = new Set(last30DaysWorkouts);
  const today = new Date();
  return Array.from({ length: 30 }, (_, i) => {
    const cur = new Date(today);
    cur.setDate(today.getDate() - (29 - i));
    const iso = toISO(cur);
    return { iso, worked: workedSet.has(iso) };
  });
}

function buildWeekDays(thisWeekWorkouts: string[]) {
  const workedSet = new Set(thisWeekWorkouts);
  const today = new Date();
  const todayISO = toISO(today);
  const DAY_LABELS = ["M", "T", "W", "Th", "F", "S", "S"];
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const cur = new Date(monday);
    cur.setDate(monday.getDate() + i);
    const iso = toISO(cur);
    return {
      iso,
      label: DAY_LABELS[i],
      worked: workedSet.has(iso),
      isToday: iso === todayISO,
      isFuture: iso > todayISO,
    };
  });
}

function getMotivation(streak: number): string {
  if (streak === 0) return "You are unstoppable. Keep fighting.";
  return "You are unstoppable. Keep fighting.";
}

function getFooterText(generalStreak: number): string {
  const next = MILESTONES.find((m) => m > generalStreak);
  if (!next) return "You've conquered every milestone.";
  const diff = next - generalStreak;
  if (diff === 1) return `Just 1 more day to reach your ${next}-day milestone!`;
  return `Keep going — ${diff} days to your ${next}-day milestone`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SvgRing({ generalStreak }: { generalStreak: number }) {
  const { offset } = getSvgRingParams(generalStreak);
  return (
    <div className="relative shrink-0 rounded-2xl bg-amber-500/10 border border-amber-400/20 p-3 flex flex-col items-center justify-center" style={{ width: 140, height: 140 }}>
      <div className="relative" style={{ width: 100, height: 100 }}>
        <svg width={100} height={100} viewBox="0 0 120 120" className="-rotate-90">
          <circle cx={60} cy={60} r={RADIUS} fill="none" stroke="rgba(251,191,36,0.15)" strokeWidth={10} />
          <circle
            cx={60} cy={60} r={RADIUS} fill="none"
            stroke="#f59e0b" strokeWidth={10} strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE} strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.6s ease", filter: "drop-shadow(0 0 4px rgba(245,158,11,0.7))" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-black text-white leading-none tabular-nums">{generalStreak}</span>
          <span className="text-[8px] font-bold text-amber-400 uppercase tracking-widest leading-none mt-0.5">DAYS</span>
        </div>
      </div>
      <span className="text-[9px] font-bold text-white/40 uppercase tracking-wide mt-1">IN A ROW</span>
    </div>
  );
}

function HeroCard({
  generalStreak,
  bestStreak,
  totalWorkoutsThisMonth,
}: {
  generalStreak: number;
  bestStreak: number;
  totalWorkoutsThisMonth: number;
}) {
  const { nextMilestone, prevMilestone, ringProgress } = getSvgRingParams(generalStreak);
  const isPersonalBest = generalStreak > 0 && generalStreak >= bestStreak;
  const [badgeImgError, setBadgeImgError] = useState(false);

  return (
    <div className="bg-gradient-to-br from-slate-700 via-slate-800 to-zinc-900 dark:from-slate-800 dark:via-slate-900 dark:to-zinc-950 rounded-2xl p-5">
      <div className="flex flex-col sm:flex-row items-center gap-5">
        <SvgRing generalStreak={generalStreak} />

        <div className="flex-1 min-w-0 w-full">
          {/* Motivation + PB badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-white/90">
              {getMotivation(generalStreak)}
            </p>
            {isPersonalBest && (
              <span className="text-[10px] font-black uppercase tracking-wide bg-white/20 text-white rounded-full px-2 py-0.5">
                🏅 NEW PERSONAL BEST
              </span>
            )}
          </div>

          {/* Milestone progress bar */}
          {nextMilestone && (
            <div className="mt-3 bg-black/20 rounded-2xl p-3">
              <div className="flex items-center gap-3">
                {/* Achieved badge (left) */}
                {prevMilestone > 0 && (
                  <div className="w-12 h-12 shrink-0">
                    <img
                      src={`/milestones/${prevMilestone}.png`}
                      alt={`${prevMilestone}d badge`}
                      className="w-full h-full object-contain drop-shadow"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                    />
                  </div>
                )}
                {/* Bar + labels */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-[10px] text-white/50 font-semibold mb-1.5">
                    <span>{prevMilestone}d</span>
                    <span className="text-amber-400">{generalStreak}d</span>
                    <span>{nextMilestone}d</span>
                  </div>
                  {/* Track */}
                  <div className="relative h-3 rounded-full bg-black/30 overflow-hidden">
                    {/* Filled portion */}
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${Math.round(ringProgress * 100)}%`,
                        background: "linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)",
                        boxShadow: "0 0 8px rgba(245,158,11,0.7)",
                      }}
                    />
                  </div>
                </div>
                {/* Next badge (right, greyed out) */}
                <div className="w-12 h-12 shrink-0">
                  {!badgeImgError ? (
                    <img
                      src={`/milestones/${nextMilestone}.png`}
                      alt={`${nextMilestone}d badge`}
                      className="w-full h-full object-contain opacity-70 grayscale brightness-150 drop-shadow"
                      onError={() => setBadgeImgError(true)}
                    />
                  ) : (
                    <span className="text-4xl leading-none">{MILESTONE_EMOJIS[nextMilestone]}</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Stat pills */}
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="rounded-xl bg-white/15 px-3 py-2">
              <div className="text-xl font-black text-white tabular-nums leading-none">
                {totalWorkoutsThisMonth}
              </div>
              <div className="text-[10px] font-semibold text-white/60 uppercase tracking-wide mt-0.5">
                This month
              </div>
            </div>
            <div className="rounded-xl bg-white/15 px-3 py-2">
              <div className="text-xl font-black text-white tabular-nums leading-none">
                {bestStreak}
              </div>
              <div className="text-[10px] font-semibold text-white/60 uppercase tracking-wide mt-0.5">
                Best streak
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConsistencyCard({ plannedLast30, completedLast30 }: { plannedLast30: number; completedLast30: number }) {
  const pct = plannedLast30 > 0 ? Math.round((completedLast30 / plannedLast30) * 100) : 0;
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-100 dark:border-zinc-800 flex flex-col gap-1">
      <div className="text-3xl font-black text-amber-500 tabular-nums leading-none">
        {pct}%
      </div>
      <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
        Consistency
      </div>
      <div className="text-[11px] text-zinc-400 dark:text-zinc-500">
        {completedLast30} of {plannedLast30} workouts this month
      </div>
    </div>
  );
}

function ThisWeekCard({ thisWeekWorkouts }: { thisWeekWorkouts: string[] }) {
  const days = buildWeekDays(thisWeekWorkouts);
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-100 dark:border-zinc-800">
      <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-3">
        This Week
      </div>
      <div className="flex items-center justify-between gap-1">
        {days.map((day) => (
          <div key={day.iso} className="flex flex-col items-center gap-1">
            <div
              className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center transition-all",
                day.worked
                  ? "bg-amber-500 ring-2 ring-amber-300"
                  : day.isToday
                  ? "border-2 border-amber-400 bg-amber-50 dark:bg-amber-900/20"
                  : day.isFuture
                  ? "border border-zinc-200 dark:border-zinc-700"
                  : "bg-zinc-100 dark:bg-zinc-800"
              )}
            >
              {day.worked && <span className="text-[11px] font-black leading-none text-white drop-shadow-sm">✓</span>}
            </div>
            <span className="text-[9px] font-semibold text-zinc-400 dark:text-zinc-500">
              {day.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MilestonesCard({ generalStreak, bestStreak }: { generalStreak: number; bestStreak: number }) {
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

function PRPanel({ prs }: { prs: PRRecord[] }) {
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
  prs: PRRecord[];
}

export function StreakCounter({ streakData, prs }: StreakCounterProps) {
  const {
    generalStreak,
    bestStreak,
    totalWorkoutsThisMonth,
    sorryUsed,
    sorryMax,
    canEditSorryMax,
    last30DaysWorkouts,
    thisWeekWorkouts,
    plannedLast30,
    completedLast30,
  } = streakData;

  return (
    <div className="mt-6 space-y-3">
      <HeroCard
        generalStreak={generalStreak}
        bestStreak={bestStreak}
        totalWorkoutsThisMonth={totalWorkoutsThisMonth}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ConsistencyCard plannedLast30={plannedLast30} completedLast30={completedLast30} />
        <ThisWeekCard thisWeekWorkouts={thisWeekWorkouts} />
      </div>
      <MilestonesCard generalStreak={generalStreak} bestStreak={bestStreak} />
      <PRPanel prs={prs} />
      <FooterCard generalStreak={generalStreak} sorryUsed={sorryUsed} sorryMax={sorryMax} canEditSorryMax={canEditSorryMax} />
    </div>
  );
}
