"use client";

import type { StreakData } from "@/lib/services/plannerService";
import type { UserBadge } from "@/constants/badges";
import { StreakHero } from "./StreakHero";
import { VolumeCasketCard } from "./VolumeCasketCard";
import { SocialCard } from "./SocialCard";
import { SpecialsCard } from "./SpecialsCard";
import { BadgeShowcase } from "./BadgeShowcase";
import { MilestonesCard } from "@/components/planner/StreakCounter";

interface ProgressPageProps {
  streakData: StreakData;
  cumulativeVolume: number;
  friendCount: number;
  fistbumpCount: number;
  userId: string;
  badges: UserBadge[];
}

export function ProgressPage({ streakData, cumulativeVolume, friendCount, fistbumpCount, userId, badges }: ProgressPageProps) {
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

      {/* 3. All achievement badges */}
      <BadgeShowcase badges={badges} cumulativeVolume={cumulativeVolume} />

      {/* 4. Volume casket */}
      <VolumeCasketCard cumulativeVolume={cumulativeVolume} />

      {/* 5. Social badges */}
      <SocialCard friendCount={friendCount} fistbumpCount={fistbumpCount} />

      {/* 6. Specials */}
      <SpecialsCard userId={userId} />
    </div>
  );
}
