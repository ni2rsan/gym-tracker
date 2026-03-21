"use client";

import type { StreakData } from "@/lib/services/plannerService";
import type { PRRecord } from "@/types";
import type { WeeklyVolumeComparison, BiggestJumpResult, TrainingBalance } from "@/lib/services/progressService";
import type { UserBadge } from "@/constants/badges";
import { StreakHero } from "./StreakHero";
import { ThisWeekCard } from "./ThisWeekCard";
import { VolumeComparisonCard } from "./VolumeComparisonCard";
import { BiggestJumpCard } from "./BiggestJumpCard";
import { PRHighlights } from "./PRHighlights";
import { BadgeShowcase } from "./BadgeShowcase";
import { TrainingBalanceCard } from "./TrainingBalanceCard";

interface ProgressPageProps {
  streakData: StreakData;
  recentPRs: PRRecord[];
  volumeComparison: WeeklyVolumeComparison;
  biggestJump: BiggestJumpResult | null;
  balance: TrainingBalance;
  badges: UserBadge[];
  cumulativeVolume: number;
}

export function ProgressPage({
  streakData,
  recentPRs,
  volumeComparison,
  biggestJump,
  balance,
  badges,
  cumulativeVolume,
}: ProgressPageProps) {
  return (
    <div className="space-y-3">
      {/* 1. Streak Hero */}
      <StreakHero
        generalStreak={streakData.generalStreak}
        bestStreak={streakData.bestStreak}
        totalWorkoutsThisMonth={streakData.totalWorkoutsThisMonth}
      />

      {/* 2. This Week + Volume (2-col) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ThisWeekCard
          thisWeekWorkouts={streakData.thisWeekWorkouts}
          plannedThisWeek={streakData.plannedThisWeek}
          completedThisWeek={streakData.completedThisWeek}
        />
        <VolumeComparisonCard data={volumeComparison} />
      </div>

      {/* 3. Biggest Jump */}
      {biggestJump && <BiggestJumpCard data={biggestJump} />}

      {/* 4. PR Highlights */}
      {recentPRs.length > 0 && <PRHighlights prs={recentPRs} />}

      {/* 5-6. Badge Showcase */}
      <BadgeShowcase badges={badges} cumulativeVolume={cumulativeVolume} />

      {/* 7. Training Balance */}
      {balance.total >= 10 && <TrainingBalanceCard data={balance} />}
    </div>
  );
}
