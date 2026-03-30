"use client";

import type { StreakData } from "@/lib/services/plannerService";
import type { TreeState } from "@/lib/gardenUtils";
import { StreakHero } from "./StreakHero";
import { VolumeCasketCard } from "./VolumeCasketCard";
import { SocialCard } from "./SocialCard";
import { SpecialsCard } from "./SpecialsCard";
import { ExerciseGarden } from "./ExerciseGarden";
import { MilestonesCard } from "@/components/planner/StreakCounter";

interface ProgressPageProps {
  streakData: StreakData;
  cumulativeVolume: number;
  friendCount: number;
  fistbumpCount: number;
  userId: string;
  stardustTotal: number;
  gardenTrees: TreeState[];
}

export function ProgressPage({ streakData, cumulativeVolume, friendCount, fistbumpCount, userId, stardustTotal, gardenTrees }: ProgressPageProps) {
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

      {/* 3. Volume casket */}
      <VolumeCasketCard cumulativeVolume={cumulativeVolume} />

      {/* 4. Social badges */}
      <SocialCard friendCount={friendCount} fistbumpCount={fistbumpCount} />

      {/* 5. Exercise Garden */}
      <ExerciseGarden stardustTotal={stardustTotal} trees={gardenTrees} />

      {/* 6. Specials */}
      <SpecialsCard userId={userId} />
    </div>
  );
}
