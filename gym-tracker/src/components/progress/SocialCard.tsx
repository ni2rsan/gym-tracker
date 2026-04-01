"use client";

import { useState } from "react";
import { ChevronDown, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SectionLayout } from "@/lib/badgeLayout";

interface SocialBadge {
  key: string;
  label: string;
  title: string;
  threshold: number;
  type: "friends" | "fistbumps";
  headline: string;
  subtext: string;
}

const FRIEND_BADGES: SocialBadge[] = [
  {
    key: "1friend",
    label: "1 Friend",
    title: "Not Alone",
    threshold: 1,
    type: "friends",
    headline: "Someone in your corner. That changes everything.",
    subtext:
      "One friend added. They can see your workouts now. No more phantom gym sessions. Accountability has arrived.",
  },
  {
    key: "5friends",
    label: "5 Friends",
    title: "Training Squad",
    threshold: 5,
    type: "friends",
    headline: "Five people who know what you're building. Keep going.",
    subtext:
      "Five friends added. At least two of them will text you \u201cgym today?\u201d and then not show up. You'll go anyway. That's the difference.",
  },
  {
    key: "10friends",
    label: "10 Friends",
    title: "The Crew",
    threshold: 10,
    type: "friends",
    headline: "Ten people watching you grow. Don't let them down. More importantly, don't let yourself down.",
    subtext:
      "Ten friends. Your rest days are now a public event. Everyone has opinions. The bar is your only honest friend.",
  },
];

const FISTBUMP_BADGES: SocialBadge[] = [
  {
    key: "1fistbump",
    label: "1 Fist Bump",
    title: "Acknowledged",
    threshold: 1,
    type: "fistbumps",
    headline: "Someone saw what you did and said: yes. That matters.",
    subtext:
      "One fistbump received. Someone out there noticed your work. It wasn't your mum. This one counts.",
  },
  {
    key: "10fistbumps",
    label: "10 Fist Bumps",
    title: "Crowd Favourite",
    threshold: 10,
    type: "fistbumps",
    headline: "Ten people took a moment to recognise your effort. You're doing something worth noticing.",
    subtext:
      "Ten fistbumps. People are watching your sessions and nodding. You haven't met most of them. They respect you anyway. Don't blow it.",
  },
  {
    key: "30fistbumps",
    label: "30 Fist Bumps",
    title: "The People's Champ",
    threshold: 30,
    type: "fistbumps",
    headline: "Thirty fistbumps. You're not just lifting for yourself anymore. You're inspiring people without even trying.",
    subtext:
      "Thirty fistbumps. At this point you walk into the gym and the playlist changes. You don't know who does it. Everyone knows why.",
  },
];

interface SocialCardProps {
  friendCount: number;
  fistbumpCount: number;
  layout?: SectionLayout | null;
}

interface ActiveBadge extends SocialBadge {
  count: number;
}

export function SocialCard({ friendCount, fistbumpCount, layout }: SocialCardProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [activeBadge, setActiveBadge] = useState<ActiveBadge | null>(null);

  const lastFriend = [...FRIEND_BADGES].reverse().find((b) => friendCount >= b.threshold) ?? null;
  const nextFriend = FRIEND_BADGES.find((b) => friendCount < b.threshold) ?? null;
  const friendPct = nextFriend
    ? Math.min(
        100,
        ((friendCount - (lastFriend?.threshold ?? 0)) /
          (nextFriend.threshold - (lastFriend?.threshold ?? 0))) *
          100
      )
    : 100;

  const lastFistbump = [...FISTBUMP_BADGES].reverse().find((b) => fistbumpCount >= b.threshold) ?? null;
  const nextFistbump = FISTBUMP_BADGES.find((b) => fistbumpCount < b.threshold) ?? null;
  const fistbumpPct = nextFistbump
    ? Math.min(
        100,
        ((fistbumpCount - (lastFistbump?.threshold ?? 0)) /
          (nextFistbump.threshold - (lastFistbump?.threshold ?? 0))) *
          100
      )
    : 100;

  const detailOverlay = activeBadge && (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60"
      onClick={() => setActiveBadge(null)}
    >
      <div
        className="bg-white dark:bg-zinc-900 rounded-2xl p-6 max-w-xs w-full text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-36 h-36 mx-auto mb-3">
          <img
            src={`/social/${activeBadge.key}.png`}
            alt={activeBadge.label}
            className="w-full h-full object-contain"
          />
        </div>
        <p className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-1">
          {activeBadge.label}
        </p>
        <p className="text-sm font-bold text-zinc-900 dark:text-white leading-snug mb-1">
          {activeBadge.title}
        </p>
        <p className="text-base font-semibold text-zinc-800 dark:text-zinc-200 leading-snug mb-2">
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
  );

  // ── Layout mode ──────────────────────────────────────────────────────────────
  if (layout) {
    const allBadges = [...FRIEND_BADGES, ...FISTBUMP_BADGES];
    return (
      <>
        {detailOverlay}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
            Social
          </div>
          <div
            className="relative w-full overflow-hidden"
            style={{ aspectRatio: String(layout.imageAspectRatio) }}
          >
            <img
              src={layout.backgroundImage}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ opacity: layout.backgroundOpacity }}
            />
            {allBadges.map((badge) => {
              const pos = layout.positions[badge.key];
              if (!pos) return null;
              const count = badge.type === "friends" ? friendCount : fistbumpCount;
              const achieved = count >= badge.threshold;
              return (
                <button
                  key={badge.key}
                  onClick={() => achieved && setActiveBadge({ ...badge, count })}
                  disabled={!achieved}
                  className="absolute hover:scale-110 transition-transform focus:outline-none"
                  style={{
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    transform: "translate(-50%, -50%)",
                    width: `${layout.badgeSizePercent}%`,
                    opacity: achieved ? 1 : 0.55,
                  }}
                >
                  <img
                    src={`/social/${badge.key}.png`}
                    alt={badge.label}
                    className={cn("w-full h-auto object-contain drop-shadow-md", !achieved && "grayscale")}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {detailOverlay}

      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden">
        {/* Card header */}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="w-full px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between focus:outline-none"
        >
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
            Social
          </span>
          <ChevronDown
            className={cn("h-4 w-4 text-zinc-400 transition-transform duration-200", collapsed && "-rotate-90")}
          />
        </button>

        {!collapsed && (
          <>
            {/* ── Friends section ── */}
            <div className="px-0 pt-3 pb-2">
              <div className="flex items-center gap-1.5 mb-2 px-2">
                <Users className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
                <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Friends</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {FRIEND_BADGES.map((badge) => {
                  const achieved = friendCount >= badge.threshold;
                  return achieved ? (
                    <button
                      key={badge.key}
                      onClick={() => setActiveBadge({ ...badge, count: friendCount })}
                      className="flex flex-col items-center focus:outline-none"
                    >
                      <div className="relative w-full aspect-square scale-[1.38] sm:scale-[0.92]">
                        <span className="sparkle" style={{ top: "30%", right: "30%" }}>✦</span>
                        <span className="sparkle sparkle-d1" style={{ top: "44%", left: "28%" }}>✦</span>
                        <span className="sparkle sparkle-d2" style={{ bottom: "28%", right: "32%" }}>✦</span>
                        <img src={`/social/${badge.key}.png`} alt={badge.label} className="w-full h-full object-contain" />
                      </div>
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase leading-none mt-1">
                        {badge.label}
                      </span>
                      <span className="text-[9px] font-medium text-zinc-500 dark:text-zinc-400 leading-tight mt-0.5 text-center">
                        {badge.title}
                      </span>
                    </button>
                  ) : (
                    <div key={badge.key} className="flex flex-col items-center opacity-25 grayscale">
                      <img src={`/social/${badge.key}.png`} alt={badge.label} className="w-full aspect-square object-contain scale-[1.38] sm:scale-[0.92]" />
                      <span className="text-[10px] font-bold text-zinc-400 uppercase leading-none mt-1">
                        {badge.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Friends progress bar */}
            <div className="px-4 pb-3 pt-1">
              <div className="flex items-center gap-2">
                <div className="w-[72px] h-[72px] sm:w-[84px] sm:h-[84px] shrink-0">
                  {lastFriend ? (
                    <img src={`/social/${lastFriend.key}.png`} alt={lastFriend.label} className="w-full h-full object-contain" />
                  ) : (
                    <div className="w-full h-full rounded-full bg-zinc-100 dark:bg-zinc-800" />
                  )}
                </div>
                <div className="flex-1 h-2.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${friendPct}%`,
                      background: "linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)",
                      boxShadow: friendPct > 0 ? "0 0 8px rgba(245,158,11,0.6)" : "none",
                    }}
                  />
                </div>
                <div className="w-[72px] h-[72px] sm:w-[84px] sm:h-[84px] shrink-0">
                  {nextFriend ? (
                    <img src={`/social/${nextFriend.key}.png`} alt={nextFriend.label} className="w-full h-full object-contain opacity-40 grayscale" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-[9px] font-black text-amber-500 uppercase">MAX</span>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-center text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 font-medium tabular-nums">
                {friendCount} {friendCount === 1 ? "friend" : "friends"}
              </p>
            </div>

            <div className="mx-4 border-t border-zinc-100 dark:border-zinc-800" />

            {/* ── Fistbumps section ── */}
            <div className="px-0 pt-3 pb-2">
              <div className="flex items-center gap-1.5 mb-2 px-2">
                <img src="/fistbumpicon.png" alt="" className="h-3.5 w-3.5 object-contain fb-icon" />
                <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Fist Bumps</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {FISTBUMP_BADGES.map((badge) => {
                  const achieved = fistbumpCount >= badge.threshold;
                  return achieved ? (
                    <button
                      key={badge.key}
                      onClick={() => setActiveBadge({ ...badge, count: fistbumpCount })}
                      className="flex flex-col items-center focus:outline-none"
                    >
                      <div className="relative w-full aspect-square scale-[1.38] sm:scale-[0.92]">
                        <span className="sparkle" style={{ top: "30%", right: "30%" }}>✦</span>
                        <span className="sparkle sparkle-d1" style={{ top: "44%", left: "28%" }}>✦</span>
                        <span className="sparkle sparkle-d2" style={{ bottom: "28%", right: "32%" }}>✦</span>
                        <img src={`/social/${badge.key}.png`} alt={badge.label} className="w-full h-full object-contain" />
                      </div>
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase leading-none mt-1">
                        {badge.label}
                      </span>
                      <span className="text-[9px] font-medium text-zinc-500 dark:text-zinc-400 leading-tight mt-0.5 text-center">
                        {badge.title}
                      </span>
                    </button>
                  ) : (
                    <div key={badge.key} className="flex flex-col items-center opacity-25 grayscale">
                      <img src={`/social/${badge.key}.png`} alt={badge.label} className="w-full aspect-square object-contain scale-[1.38] sm:scale-[0.92]" />
                      <span className="text-[10px] font-bold text-zinc-400 uppercase leading-none mt-1">
                        {badge.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Fistbumps progress bar */}
            <div className="px-4 pb-4 pt-1">
              <div className="flex items-center gap-2">
                <div className="w-[72px] h-[72px] sm:w-[84px] sm:h-[84px] shrink-0">
                  {lastFistbump ? (
                    <img src={`/social/${lastFistbump.key}.png`} alt={lastFistbump.label} className="w-full h-full object-contain" />
                  ) : (
                    <div className="w-full h-full rounded-full bg-zinc-100 dark:bg-zinc-800" />
                  )}
                </div>
                <div className="flex-1 h-2.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${fistbumpPct}%`,
                      background: "linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)",
                      boxShadow: fistbumpPct > 0 ? "0 0 8px rgba(245,158,11,0.6)" : "none",
                    }}
                  />
                </div>
                <div className="w-[72px] h-[72px] sm:w-[84px] sm:h-[84px] shrink-0">
                  {nextFistbump ? (
                    <img src={`/social/${nextFistbump.key}.png`} alt={nextFistbump.label} className="w-full h-full object-contain opacity-40 grayscale" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-[9px] font-black text-amber-500 uppercase">MAX</span>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-center text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 font-medium tabular-nums">
                {fistbumpCount} {fistbumpCount === 1 ? "fist bump" : "fist bumps"} received
              </p>
            </div>
          </>
        )}
      </div>
    </>
  );
}
