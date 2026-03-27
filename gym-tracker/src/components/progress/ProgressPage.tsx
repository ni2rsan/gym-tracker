"use client";

import type { StreakData } from "@/lib/services/plannerService";
import type { PRRecord } from "@/types";
import { StreakHero } from "./StreakHero";
import { VolumeCasketCard } from "./VolumeCasketCard";
import { SocialCard } from "./SocialCard";
import { SpecialsCard } from "./SpecialsCard";
import { MilestonesCard, PRPanel } from "@/components/planner/StreakCounter";

interface ProgressPageProps {
  streakData: StreakData;
  prs: PRRecord[];
  cumulativeVolume: number;
  friendCount: number;
  fistbumpCount: number;
  userId: string;
}

export function ProgressPage({ streakData, prs, cumulativeVolume, friendCount, fistbumpCount, userId }: ProgressPageProps) {
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

      {/* 3. All PRs by group */}
      {prs.length > 0 && <PRPanel prs={prs} />}

      {/* 4. Volume casket */}
      <VolumeCasketCard cumulativeVolume={cumulativeVolume} />

      {/* 5. Social badges */}
      <SocialCard friendCount={friendCount} fistbumpCount={fistbumpCount} />

      {/* 6. Specials */}
      <SpecialsCard userId={userId} />
    </div>
  );
}
