"use client";

import type { StreakData } from "@/lib/services/plannerService";
import type { PRRecord } from "@/types";
import { StreakHero } from "./StreakHero";
import { PRHighlights } from "./PRHighlights";
import { VolumeCasketCard } from "./VolumeCasketCard";
import { MilestonesCard, PRPanel } from "@/components/planner/StreakCounter";

interface ProgressPageProps {
  streakData: StreakData;
  prs: PRRecord[];
  cumulativeVolume: number;
}

export function ProgressPage({ streakData, prs, cumulativeVolume }: ProgressPageProps) {
  const recentPRs = [...prs]
    .sort((a, b) => b.achievedOn.localeCompare(a.achievedOn))
    .slice(0, 3);

  return (
    <div className="space-y-3">
      {/* 1. Workouts */}
      <StreakHero
        totalTracked={streakData.totalTracked}
        totalPlanned={streakData.totalPlanned}
        totalMissed={streakData.totalMissed}
      />

      {/* 2. Milestones */}
      <MilestonesCard totalTracked={streakData.totalTracked} />

      {/* 3. Newest PRs (top 3) */}
      {recentPRs.length > 0 && <PRHighlights prs={recentPRs} />}

      {/* 4. All PRs by group */}
      {prs.length > 0 && <PRPanel prs={prs} />}

      {/* 5. Volume casket */}
      <VolumeCasketCard cumulativeVolume={cumulativeVolume} />
    </div>
  );
}
