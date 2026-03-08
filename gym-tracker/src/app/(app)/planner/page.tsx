import { getCurrentUserId } from "@/lib/auth-helpers";
import { getPlannedWorkoutsInRange, getTrackedGroupsByDate, getStreakData } from "@/lib/services/plannerService";
import { WorkoutCalendar } from "@/components/planner/WorkoutCalendar";

export const metadata = { title: "Planner — Gym Tracker" };
export const dynamic = "force-dynamic";

export default async function PlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const userId = await getCurrentUserId();
  const params = await searchParams;

  const now = new Date();
  const year = params.year ? parseInt(params.year) : now.getFullYear();
  const month = params.month ? parseInt(params.month) : now.getMonth(); // 0-indexed

  // Fetch a wide range: 3 months back to 13 months forward for Year/All views
  const startDate = new Date(year, month - 3, 1).toISOString().split("T")[0];
  const endDate = new Date(year + 1, month + 1, 0).toISOString().split("T")[0];

  const [plannedWorkouts, trackedGroupsByDate, streakData] = await Promise.all([
    getPlannedWorkoutsInRange(userId, startDate, endDate),
    getTrackedGroupsByDate(userId, startDate, endDate),
    getStreakData(userId),
  ]);

  const serialized = plannedWorkouts.map((pw) => ({
    id: pw.id,
    date: (() => { const d = pw.date; const y = d.getUTCFullYear(); const m = String(d.getUTCMonth()+1).padStart(2,"0"); const day = String(d.getUTCDate()).padStart(2,"0"); return `${y}-${m}-${day}`; })(),
    blockType: pw.blockType as string,
    seriesId: pw.seriesId,
    sorryExcused: pw.sorryExcused,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Workout Planner</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
          Plan and schedule your workouts.
        </p>
      </div>
      <WorkoutCalendar
        plannedWorkouts={serialized}
        trackedGroupsByDate={trackedGroupsByDate}
        initialYear={year}
        initialMonth={month}
        initialStreakData={streakData}
      />
    </div>
  );
}
