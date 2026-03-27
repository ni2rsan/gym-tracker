import { getCurrentUserId } from "@/lib/auth-helpers";
import { getStreakData } from "@/lib/services/plannerService";
import { getPersonalRecords } from "@/lib/services/reportService";
import { getCumulativeVolume } from "@/lib/services/progressService";
import { getSocialStats } from "@/lib/services/socialService";
import { ProgressPage } from "@/components/progress/ProgressPage";

export const metadata = { title: "Progress — Gym Tracker" };
export const dynamic = "force-dynamic";

export default async function Progress() {
  const userId = await getCurrentUserId();

  const [streakData, prs, cumulativeVolume, socialStats] = await Promise.all([
    getStreakData(userId),
    getPersonalRecords(userId),
    getCumulativeVolume(userId),
    getSocialStats(userId),
  ]);

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
        prs={prs}
        cumulativeVolume={cumulativeVolume}
        friendCount={socialStats.friendCount}
        fistbumpCount={socialStats.totalFistBumpsReceived}
        userId={userId}
      />
    </div>
  );
}
