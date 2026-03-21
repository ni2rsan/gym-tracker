import { getCurrentUserId } from "@/lib/auth-helpers";
import { getStreakData } from "@/lib/services/plannerService";
import { getPersonalRecords } from "@/lib/services/reportService";
import {
  getWeeklyVolumeComparison,
  getBiggestJump,
  getTrainingBalance,
  getCumulativeVolume,
  getTotalWorkoutCount,
  getRecentPRs,
  computeBadges,
  hasAllrounderThisWeek,
} from "@/lib/services/progressService";
import { ProgressPage } from "@/components/progress/ProgressPage";

export const metadata = { title: "Fortschritt — Gym Tracker" };
export const dynamic = "force-dynamic";

export default async function Progress() {
  const userId = await getCurrentUserId();

  const [streakData, prs, volumeComparison, biggestJump, balance, cumulativeVolume, totalWorkouts, allrounder] =
    await Promise.all([
      getStreakData(userId),
      getPersonalRecords(userId),
      getWeeklyVolumeComparison(userId),
      getBiggestJump(userId),
      getTrainingBalance(userId),
      getCumulativeVolume(userId),
      getTotalWorkoutCount(userId),
      hasAllrounderThisWeek(userId),
    ]);

  // Get recent workout dates for badge computation
  const recentWorkoutDates = streakData.last30DaysWorkouts;

  const badges = computeBadges({
    bestStreak: streakData.bestStreak,
    plannedLast30: streakData.plannedLast30,
    completedLast30: streakData.completedLast30,
    thisWeekWorkouts: streakData.thisWeekWorkouts,
    prs,
    cumulativeVolume,
    totalWorkouts,
    recentWorkoutDates,
    last30DaysWorkouts: streakData.last30DaysWorkouts,
  });

  // Mark allrounder badge
  const badgesWithAllrounder = badges.map((b) =>
    b.key === "allrounder" ? { ...b, unlocked: allrounder } : b
  );

  const recentPRs = getRecentPRs(prs);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Fortschritt</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
          Dein Momentum, deine Erfolge.
        </p>
      </div>
      <ProgressPage
        streakData={streakData}
        recentPRs={recentPRs}
        volumeComparison={volumeComparison}
        biggestJump={biggestJump}
        balance={balance}
        badges={badgesWithAllrounder}
        cumulativeVolume={cumulativeVolume}
      />
    </div>
  );
}
