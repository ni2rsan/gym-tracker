import { getCurrentUserId } from "@/server/auth-helpers";
import { getStreakData } from "@/server/services/plannerService";
import { getCumulativeVolume } from "@/server/services/progressService";
import { getSocialStats } from "@/server/services/socialService";
import { getOrSyncStardust } from "@/server/services/gardenService";
import { getGardenState } from "@/core/domain/gardenUtils";
import { ProgressPage } from "@/features/progress/components/ProgressPage";
import { prisma } from "@/server/prisma";

export const metadata = { title: "Progress — Gym Tracker" };
export const dynamic = "force-dynamic";

export default async function Progress() {
  const userId = await getCurrentUserId();

  const [streakData, cumulativeVolume, socialStats, stardustTotal, user] = await Promise.all([
    getStreakData(userId),
    getCumulativeVolume(userId),
    getSocialStats(userId),
    getOrSyncStardust(userId),
    prisma.user.findUnique({ where: { id: userId }, select: { role: true } }),
  ]);
  const gardenTrees = getGardenState(stardustTotal);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Progress</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
          Your momentum, your achievements.
        </p>
      </div>
      <ProgressPage
        streakData={streakData}
        cumulativeVolume={cumulativeVolume}
        friendCount={socialStats.friendCount}
        fistbumpCount={socialStats.totalFistBumpsReceived}
        userId={userId}
        isAdmin={user?.role === "ADMIN"}
        stardustTotal={stardustTotal}
        gardenTrees={gardenTrees}
      />
    </div>
  );
}
