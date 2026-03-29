"use client";

import { cn } from "@/lib/utils";
import { Lock } from "lucide-react";
import type { UserBadge } from "@/constants/badges";
import { RARITY_COLORS, CATEGORY_LABELS, type BadgeCategory } from "@/constants/badges";

interface BadgeShowcaseProps {
  badges: UserBadge[];
  cumulativeVolume: number;
}

function BadgeCard({ badge }: { badge: UserBadge }) {
  const colors = RARITY_COLORS[badge.rarity];

  return (
    <div
      className={cn(
        "relative flex flex-col items-center gap-1 rounded-xl border p-3 transition-all",
        badge.unlocked
          ? `${colors.bg} ${colors.border}`
          : "border-zinc-200 dark:border-zinc-800 opacity-40 grayscale"
      )}
    >
      <span className="text-2xl leading-none">{badge.icon}</span>
      <span className={cn(
        "text-[10px] font-bold text-center leading-tight",
        badge.unlocked ? colors.text : "text-zinc-500 dark:text-zinc-400"
      )}>
        {badge.name}
      </span>
      {!badge.unlocked && (
        <Lock className="absolute top-1 right-1 h-3 w-3 text-zinc-400 dark:text-zinc-600" />
      )}
    </div>
  );
}

export function BadgeShowcase({ badges, cumulativeVolume }: BadgeShowcaseProps) {
  const unlocked = badges.filter((b) => b.unlocked);
  const totalBadges = badges.length;

  // Find next badge to unlock (first locked with highest progress)
  const locked = badges
    .filter((b) => !b.unlocked && b.progress != null)
    .sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0));
  const nextBadge = locked[0] ?? null;

  // Group by category
  const categories = [...new Set(badges.map((b) => b.category))] as BadgeCategory[];

  return (
    <div className="space-y-3">
      {/* Next Badge Progress */}
      {nextBadge && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
              Next Badge
            </span>
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              {unlocked.length} / {totalBadges} unlocked
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-3xl leading-none">{nextBadge.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-zinc-900 dark:text-white">{nextBadge.name}</p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{nextBadge.description}</p>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-500 transition-all duration-700"
                    style={{ width: `${Math.round((nextBadge.progress ?? 0) * 100)}%` }}
                  />
                </div>
                {nextBadge.progressLabel && (
                  <span className="text-[10px] font-bold text-amber-500 tabular-nums shrink-0">
                    {nextBadge.progressLabel}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Badge Grid */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800">
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
            Achievements
          </span>
        </div>
        <div className="p-3 space-y-4">
          {categories.map((cat) => {
            const catBadges = badges.filter((b) => b.category === cat);
            return (
              <div key={cat}>
                <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-2 block">
                  {CATEGORY_LABELS[cat]}
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {catBadges.map((badge) => (
                    <BadgeCard key={badge.key} badge={badge} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        {/* Cumulative volume stat */}
        {cumulativeVolume > 0 && (
          <div className="px-4 py-3 border-t border-zinc-100 dark:border-zinc-800 text-center">
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
              Total moved:{" "}
              <span className="font-bold text-zinc-600 dark:text-zinc-300 tabular-nums">
                {cumulativeVolume >= 1000
                  ? `${(cumulativeVolume / 1000).toFixed(1)} tonnes`
                  : `${Math.round(cumulativeVolume).toLocaleString("en")} kg`}
              </span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
