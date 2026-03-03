import { Suspense } from "react";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { getExercisesForUser } from "@/lib/services/exerciseService";
import { getLatestBodyMetric } from "@/lib/services/metricsService";
import { MetricsCards } from "@/components/metrics/MetricsCards";
import { WorkoutForm } from "@/components/workout/WorkoutForm";

export const metadata = { title: "Workout — Gym Tracker" };
export const dynamic = "force-dynamic";

export default async function WorkoutPage() {
  const userId = await getCurrentUserId();

  const [exercises, latestMetric] = await Promise.all([
    getExercisesForUser(userId),
    getLatestBodyMetric(userId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Today's Workout</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
          Log your sets and track your progress.
        </p>
      </div>

      {/* Body metrics — shown above exercises */}
      <Suspense fallback={<div className="grid grid-cols-2 gap-4"><div className="h-20 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" /><div className="h-20 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" /></div>}>
        <MetricsCards
          currentWeight={latestMetric?.weightKg ? Number(latestMetric.weightKg) : null}
          currentBodyFat={latestMetric?.bodyFatPct ? Number(latestMetric.bodyFatPct) : null}
        />
      </Suspense>

      {/* Workout form */}
      <WorkoutForm initialExercises={exercises} />
    </div>
  );
}
