import { Suspense } from "react";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { getExercisesForUser } from "@/lib/services/exerciseService";
import { getLatestBodyMetric, getLastNBodyMetrics, getLatestWithingsMetric, getWeekAgoMetrics } from "@/lib/services/metricsService";
import { syncWithingsIfNeeded, getWithingsConnection } from "@/lib/services/withingsService";
import { MetricsCards } from "@/components/metrics/MetricsCards";
import { WithingsPanel } from "@/components/metrics/WithingsPanel";
import { WorkoutForm } from "@/components/workout/WorkoutForm";

export const metadata = { title: "Workout Tracker — Gym Tracker" };
export const dynamic = "force-dynamic";

export default async function WorkoutPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const initialDate =
    params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : undefined;

  const userId = await getCurrentUserId();

  // Sync Withings data before loading the page (no-op if not connected)
  await syncWithingsIfNeeded(userId);

  const [exercises, latestMetric, recentEntries, withingsConnection, latestWithings, weekAgoMetric] = await Promise.all([
    getExercisesForUser(userId),
    getLatestBodyMetric(userId),
    getLastNBodyMetrics(userId, 7),
    getWithingsConnection(userId),
    getLatestWithingsMetric(userId),
    getWeekAgoMetrics(userId),
  ]);

  const isWithingsConnected = !!(withingsConnection?.isActive);

  // Serialize fields for client components (values are daily averages as JS numbers)
  const serializedEntries = recentEntries.map((e) => ({
    date: e.date,
    weightKg: e.weightKg !== null ? e.weightKg.toFixed(1) : null,
    bodyFatPct: e.bodyFatPct !== null ? e.bodyFatPct.toFixed(1) : null,
    fatMassKg: e.fatMassKg !== null ? e.fatMassKg.toFixed(1) : null,
    muscleMassKg: e.muscleMassKg !== null ? e.muscleMassKg.toFixed(1) : null,
    recordedAt: e.recordedAt.toISOString(),
    source: e.source,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Workout Tracker</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
          Log your sets and track your progress.
        </p>
      </div>

      {/* Body metrics */}
      <div className="space-y-3">
        <Suspense fallback={<div className="grid grid-cols-2 gap-4"><div className="h-20 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" /><div className="h-20 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" /></div>}>
          <MetricsCards
            currentWeight={latestMetric?.weightKg ? Number(latestMetric.weightKg) : null}
            currentBodyFat={latestMetric?.bodyFatPct ? Number(latestMetric.bodyFatPct) : null}
            currentFatMassKg={latestMetric?.fatMassKg ? Number(latestMetric.fatMassKg) : null}
            currentMuscleMassKg={latestMetric?.muscleMassKg ? Number(latestMetric.muscleMassKg) : null}
            weightSource={latestMetric?.weightSource}
            bodyFatSource={latestMetric?.bodyFatSource}
            withingsWeight={latestWithings.weightKg ? Number(latestWithings.weightKg) : null}
            withingsBodyFat={latestWithings.bodyFatPct ? Number(latestWithings.bodyFatPct) : null}
            weekAgoWeight={weekAgoMetric.weightKg}
            weekAgoBodyFat={weekAgoMetric.bodyFatPct}
            weekAgoFatMassKg={weekAgoMetric.fatMassKg}
            weekAgoMuscleMassKg={weekAgoMetric.muscleMassKg}
            isWithingsConnected={isWithingsConnected}
          />
        </Suspense>

        <WithingsPanel
          isConnected={isWithingsConnected}
          lastSyncAt={withingsConnection?.lastSyncAt?.toISOString() ?? null}
          recentEntries={serializedEntries}
        />
      </div>

      {/* Workout form */}
      <WorkoutForm initialExercises={exercises} initialDate={initialDate} />
    </div>
  );
}
