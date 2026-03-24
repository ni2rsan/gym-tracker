"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface VolumeBadge {
  key: string;
  label: string;
  thresholdKg: number;
  headline: string | null;
  subtext: string | null;
}

const VOLUME_BADGES: VolumeBadge[] = [
  { key: "50t",   label: "50T",   thresholdKg: 50_000,    headline: "You moved 19 hippopotamuses", subtext: "A full crash of hippos. They were furious. You didn't negotiate." },
  { key: "100t",  label: "100T",  thresholdKg: 100_000,   headline: "You moved a blue whale", subtext: "Nature's answer to \"how big can you make a thing before it stops working.\" The answer is: this big, barely." },
  { key: "150t",  label: "150T",  thresholdKg: 150_000,   headline: "You moved an empty Boeing 747", subtext: "150 tonnes of recycled air, broken seat-back screens, and quiet despair." },
  { key: "250t",  label: "250T",  thresholdKg: 250_000,   headline: "You moved the world's biggest dump truck", subtext: "The tires alone cost $42,000 each. It cannot legally drive on any road. It exists only for this." },
  { key: "500t",  label: "500T",  thresholdKg: 500_000,   headline: "You moved the Eiffel Tower", subtext: "Iron structure only. Gustave Eiffel got dunked on by every Parisian for years. He was fine. So are you." },
  { key: "750t",  label: "750T",  thresholdKg: 750_000,   headline: "You moved a fully loaded Airbus A380", subtext: "500 passengers. None of them voted on this. You moved them anyway." },
  { key: "1000t", label: "1000T", thresholdKg: 1_000_000, headline: "You moved the Saturn V rocket", subtext: "Fuelled. Three astronauts on top. They filed a formal complaint. You filed a new PR." },
  { key: "1500t", label: "1500T", thresholdKg: 1_500_000, headline: "You moved a nuclear submarine", subtext: "Virginia-class. The crew had a very bad Tuesday. You had a very good one." },
  { key: "2000t", label: "2000T", thresholdKg: 2_000_000, headline: "You moved the Statue of Liberty", subtext: "Pedestal included. She looked alarmed. You had excellent form." },
  { key: "2500t", label: "2500T", thresholdKg: 2_500_000, headline: "You moved the world's largest crane", subtext: "A machine so big it needs its own crane to assemble it. You moved it without one." },
  { key: "3000t", label: "3000T", thresholdKg: 3_000_000, headline: "You moved an Iowa battleship hull", subtext: "Empty. The guns are someone else's problem. The hull was yours." },
  { key: "4000t", label: "4000T", thresholdKg: 4_000_000, headline: "You moved the top third of the Great Pyramid", subtext: "3,000 years old. Never moved. Until you showed up." },
  { key: "5000t", label: "5000T", thresholdKg: 5_000_000, headline: "You moved a tenth of a Nimitz carrier", subtext: "One-tenth of an aircraft carrier. The Navy has questions. You have gains." },
];

function formatVolume(kg: number): string {
  if (kg >= 1000) return `You moved ${(kg / 1000).toFixed(1)} t total`;
  return `You moved ${kg.toLocaleString()} kg total`;
}

interface VolumeCasketCardProps {
  cumulativeVolume: number;
}

export function VolumeCasketCard({ cumulativeVolume }: VolumeCasketCardProps) {
  const [open, setOpen] = useState(false);
  const [activeBadge, setActiveBadge] = useState<VolumeBadge | null>(null);

  const achievedBadges = VOLUME_BADGES.filter((b) => cumulativeVolume >= b.thresholdKg);
  const lockedBadges = VOLUME_BADGES.filter((b) => cumulativeVolume < b.thresholdKg);
  const lastAchieved = achievedBadges.at(-1) ?? null;
  const nextBadge = lockedBadges[0] ?? null;

  const progressPct = nextBadge
    ? Math.min(
        100,
        ((cumulativeVolume - (lastAchieved?.thresholdKg ?? 0)) /
          (nextBadge.thresholdKg - (lastAchieved?.thresholdKg ?? 0))) *
          100
      )
    : 100;

  // Columns: cap at 5, so badges shrink automatically as more are earned
  const cols = Math.min(Math.max(achievedBadges.length, 1), 5);

  return (
    <>
      {/* Badge detail overlay */}
      {activeBadge && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60"
          onClick={() => setActiveBadge(null)}
        >
          <div
            className="bg-white dark:bg-zinc-900 rounded-2xl p-6 max-w-xs w-full text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={`/volume/${activeBadge.key}.png`}
              alt={activeBadge.label}
              className="w-24 h-24 object-contain mx-auto mb-3"
            />
            <p className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-1">
              {activeBadge.label}
            </p>
            <p className="text-base font-bold text-zinc-900 dark:text-white leading-snug mb-2">
              {activeBadge.headline}
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              {activeBadge.subtext}
            </p>
            <button
              onClick={() => setActiveBadge(null)}
              className="mt-4 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden">
        {/* Card header */}
        <div className="px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800">
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
            Volume
          </span>
        </div>

        {/* Casket image — achieved badges overlaid inside when open */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-full block focus:outline-none relative"
          aria-label={open ? "Close casket" : "Open casket"}
        >
          <img
            src={open ? "/volume/casketopen.png" : "/volume/casketclosed.png"}
            alt={open ? "Open casket" : "Closed casket"}
            className="w-full"
          />

          {/* Achieved badges overlaid inside the open casket */}
          {open && achievedBadges.length > 0 && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ padding: "12% 10% 8%" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="grid w-full gap-x-1 gap-y-0.5"
                style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
              >
                {achievedBadges.map((badge) => (
                  <button
                    key={badge.key}
                    onClick={() => setActiveBadge(badge)}
                    className="flex flex-col items-center focus:outline-none"
                  >
                    <img
                      src={`/volume/${badge.key}.png`}
                      alt={badge.label}
                      className="w-full aspect-square object-contain drop-shadow-sm"
                    />
                    <span className="text-[6px] sm:text-[8px] font-black text-white/90 uppercase leading-none mt-0.5 drop-shadow">
                      {badge.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </button>

        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 text-center py-1 font-medium">
          {open ? "Tap to close" : "Tap to open"}
        </p>

        {/* Locked badges — outside, below the casket */}
        {open && lockedBadges.length > 0 && (
          <div className="px-4 pb-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-2">Locked</p>
            <div className="grid grid-cols-5 gap-2">
              {lockedBadges.map((badge) => (
                <div key={badge.key} className="flex flex-col items-center opacity-25 grayscale">
                  <img
                    src={`/volume/${badge.key}.png`}
                    alt={badge.label}
                    className="w-full aspect-square object-contain"
                  />
                  <span className="text-[8px] font-bold text-zinc-400 uppercase leading-none mt-0.5">
                    {badge.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Progress bar */}
        <div className="px-4 pb-4 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 shrink-0">
              {lastAchieved ? (
                <img
                  src={`/volume/${lastAchieved.key}.png`}
                  alt={lastAchieved.label}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-zinc-100 dark:bg-zinc-800" />
              )}
            </div>

            <div className="flex-1 h-3 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${progressPct}%`,
                  background: "linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)",
                  boxShadow: progressPct > 0 ? "0 0 8px rgba(245,158,11,0.6)" : "none",
                }}
              />
            </div>

            <div className="w-10 h-10 shrink-0">
              {nextBadge ? (
                <img
                  src={`/volume/${nextBadge.key}.png`}
                  alt={nextBadge.label}
                  className={cn("w-full h-full object-contain opacity-40 grayscale")}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-[9px] font-black text-amber-500 uppercase">MAX</span>
                </div>
              )}
            </div>
          </div>

          <p className="text-center text-[11px] text-zinc-500 dark:text-zinc-400 mt-1.5 font-medium tabular-nums">
            {formatVolume(cumulativeVolume)}
          </p>
        </div>
      </div>
    </>
  );
}
