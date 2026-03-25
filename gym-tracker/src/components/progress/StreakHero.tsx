"use client";

import { useState } from "react";

const MILESTONES = [1, 10, 20, 30, 50, 60, 75, 100];

function getMilestoneParams(totalTracked: number) {
  const nextMilestone = MILESTONES.find((m) => m > totalTracked) ?? null;
  const prevMilestone = [...MILESTONES].reverse().find((m) => m <= totalTracked) ?? null;
  const ringProgress = nextMilestone && prevMilestone != null
    ? (totalTracked - prevMilestone) / (nextMilestone - prevMilestone)
    : nextMilestone ? totalTracked / nextMilestone
    : 1;
  return { nextMilestone, prevMilestone, ringProgress };
}

function getMilestoneText(totalTracked: number): string {
  const next = MILESTONES.find((m) => m > totalTracked);
  if (!next) return "You've hit every workout milestone.";
  const diff = next - totalTracked;
  if (diff === 1) return `Just 1 more workout to reach the ${next}-workout milestone!`;
  return `Keep going — ${diff} workouts to your ${next}-workout milestone`;
}

interface StreakHeroProps {
  totalTracked: number;
  totalPlanned: number;
  totalMissed: number;
}

export function StreakHero({ totalTracked, totalPlanned, totalMissed }: StreakHeroProps) {
  const { nextMilestone, prevMilestone, ringProgress } = getMilestoneParams(totalTracked);
  const [badgeImgError, setBadgeImgError] = useState(false);
  const [nextBadgeImgError, setNextBadgeImgError] = useState(false);

  const consistency = totalPlanned > 0 ? Math.round(((totalPlanned - totalMissed) / totalPlanned) * 100) : 0;

  return (
    <div className="bg-gradient-to-br from-slate-700 via-slate-800 to-zinc-900 dark:from-slate-800 dark:via-slate-900 dark:to-zinc-950 rounded-2xl p-5">
      <style>{`
        @keyframes hero-badge-shine {
          0%   { transform: translateX(-130%) skewX(-20deg); }
          100% { transform: translateX(230%)  skewX(-20deg); }
        }
        .hero-badge-shine::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255,255,255,0.08) 30%,
            rgba(255,255,255,0.55) 50%,
            rgba(255,255,255,0.08) 70%,
            transparent 100%
          );
          -webkit-mask-image: radial-gradient(circle 45% at center, black 40%, transparent 75%);
          mask-image: radial-gradient(circle 45% at center, black 40%, transparent 75%);
          animation: hero-badge-shine 2.8s ease-in-out infinite;
          pointer-events: none;
        }
      `}</style>
      <div className="flex flex-col sm:flex-row items-center gap-5">
        {/* Current milestone badge */}
        <div className="relative shrink-0 flex flex-col items-center justify-center" style={{ width: 140, height: 140 }}>
          {prevMilestone != null ? (
            <div
              className={`relative w-32 h-32 overflow-hidden ${!badgeImgError ? "hero-badge-shine" : ""}`}
            >
              {!badgeImgError ? (
                <img
                  src={`/milestones/${prevMilestone}.png`}
                  alt={`${prevMilestone} workouts`}
                  className="w-full h-full object-contain drop-shadow"
                  onError={() => setBadgeImgError(true)}
                />
              ) : (
                <span className="text-5xl leading-none flex items-center justify-center w-full h-full">🏅</span>
              )}
            </div>
          ) : (
            <div className="w-32 h-32 flex items-center justify-center">
              <span className="text-6xl leading-none">🎯</span>
            </div>
          )}
          <span className="text-[9px] font-bold text-white/40 uppercase tracking-wide mt-1">
            {totalTracked} WORKOUTS
          </span>
        </div>

        <div className="flex-1 min-w-0 w-full">
          {/* Milestone text */}
          <p className="text-sm font-bold text-white/90 mb-3">
            {getMilestoneText(totalTracked)}
          </p>

          {/* Milestone progress bar */}
          {nextMilestone && (
            <div className="bg-black/20 rounded-2xl p-3 mb-3">
              <div className="flex items-center gap-3">
                {prevMilestone != null && (
                  <div className="w-12 h-12 shrink-0">
                    <img
                      src={`/milestones/${prevMilestone}.png`}
                      alt={`${prevMilestone} workouts`}
                      className="w-full h-full object-contain drop-shadow"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-[10px] text-white/50 font-semibold mb-1.5">
                    <span>{prevMilestone ?? 0}</span>
                    <span className="text-amber-400">{totalTracked}</span>
                    <span>{nextMilestone}</span>
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
                  {!nextBadgeImgError ? (
                    <img
                      src={`/milestones/${nextMilestone}.png`}
                      alt={`${nextMilestone} workouts`}
                      className="w-full h-full object-contain opacity-70 grayscale brightness-150 drop-shadow"
                      onError={() => setNextBadgeImgError(true)}
                    />
                  ) : (
                    <span className="text-4xl leading-none">🏅</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Stat pills — 2×2 grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-white/15 px-3 py-2">
              <div className="text-xl font-black text-white tabular-nums leading-none">{totalPlanned}</div>
              <div className="text-[10px] font-semibold text-white/60 uppercase tracking-wide mt-0.5">Planned</div>
            </div>
            <div className="rounded-xl bg-white/15 px-3 py-2">
              <div className="text-xl font-black text-white tabular-nums leading-none">{totalMissed}</div>
              <div className="text-[10px] font-semibold text-white/60 uppercase tracking-wide mt-0.5">Missed</div>
            </div>
            <div className="rounded-xl bg-white/15 px-3 py-2">
              <div className="text-xl font-black text-white tabular-nums leading-none">{totalTracked}</div>
              <div className="text-[10px] font-semibold text-white/60 uppercase tracking-wide mt-0.5">Tracked</div>
            </div>
            <div className="rounded-xl bg-white/15 px-3 py-2">
              <div className="text-xl font-black text-white tabular-nums leading-none">{consistency}%</div>
              <div className="text-[10px] font-semibold text-white/60 uppercase tracking-wide mt-0.5">Consistency</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
