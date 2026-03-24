"use client";

import { useState } from "react";

const MILESTONES = [10, 30, 50, 75, 100];
const MILESTONE_EMOJIS: Record<number, string> = {
  10: "🥉", 30: "🥈", 50: "🥇", 75: "💎", 100: "👑",
};

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

function getFooterText(generalStreak: number): string {
  const next = MILESTONES.find((m) => m > generalStreak);
  if (!next) return "You've conquered every milestone.";
  const diff = next - generalStreak;
  if (diff === 1) return `Just 1 more day to reach your ${next}-day milestone!`;
  return `Keep going — ${diff} days to your ${next}-day milestone`;
}

interface StreakHeroProps {
  generalStreak: number;
  bestStreak: number;
  totalWorkoutsThisMonth: number;
}

export function StreakHero({ generalStreak, bestStreak, totalWorkoutsThisMonth }: StreakHeroProps) {
  const { nextMilestone, prevMilestone, ringProgress, offset } = getSvgRingParams(generalStreak);
  const isPersonalBest = generalStreak > 0 && generalStreak >= bestStreak;
  const [badgeImgError, setBadgeImgError] = useState(false);

  return (
    <div className="bg-gradient-to-br from-slate-700 via-slate-800 to-zinc-900 dark:from-slate-800 dark:via-slate-900 dark:to-zinc-950 rounded-2xl p-5">
      <div className="flex flex-col sm:flex-row items-center gap-5">
        {/* SVG Ring */}
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

        <div className="flex-1 min-w-0 w-full">
          {/* Motivation + PB badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-white/90">
              {getFooterText(generalStreak)}
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
                {prevMilestone > 0 && (
                  <div className="w-12 h-12 shrink-0">
                    <img
                      src={`/milestones/${prevMilestone}.png`}
                      alt={`${prevMilestone}d`}
                      className="w-full h-full object-contain drop-shadow"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-[10px] text-white/50 font-semibold mb-1.5">
                    <span>{prevMilestone}d</span>
                    <span className="text-amber-400">{generalStreak}d</span>
                    <span>{nextMilestone}d</span>
                  </div>
                  <div className="relative h-3 rounded-full bg-black/30 overflow-hidden">
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
                <div className="w-12 h-12 shrink-0">
                  {!badgeImgError ? (
                    <img
                      src={`/milestones/${nextMilestone}.png`}
                      alt={`${nextMilestone}d`}
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
