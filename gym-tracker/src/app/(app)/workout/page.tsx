import { Suspense } from "react";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { getExercisesForUser } from "@/lib/services/exerciseService";
import { getLatestBodyMetric, getLastNBodyMetrics } from "@/lib/services/metricsService";
import { syncWithingsIfNeeded, getWithingsConnection } from "@/lib/services/withingsService";
import { MetricsCards } from "@/components/metrics/MetricsCards";
import { WithingsPanel } from "@/components/metrics/WithingsPanel";
import { WorkoutForm } from "@/components/workout/WorkoutForm";

export const metadata = { title: "Workout — Gym Tracker" };
export const dynamic = "force-dynamic";

export default async function WorkoutPage() {
  const userId = await getCurrentUserId();

  // Sync Withings data before loading the page (no-op if not connected)
  await syncWithingsIfNeeded(userId);

  const [exercises, latestMetric, recentEntries, withingsConnection] = await Promise.all([
    getExercisesForUser(userId),
    getLatestBodyMetric(userId),
    getLastNBodyMetrics(userId, 7),
    getWithingsConnection(userId),
  ]);

  const isWithingsConnected = !!(withingsConnection?.isActive);

  // Serialize Decimal fields for client components
  const serializedEntries = recentEntries.map((e) => ({
    id: e.id,
    weightKg: e.weightKg ? String(e.weightKg) : null,
    bodyFatPct: e.bodyFatPct ? String(e.bodyFatPct) : null,
    recordedAt: e.recordedAt.toISOString(),
    source: e.source,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Today&apos;s Workout</h1>
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
            weightSource={latestMetric?.weightSource}
            bodyFatSource={latestMetric?.bodyFatSource}
          />
        </Suspense>

        <WithingsPanel
          isConnected={isWithingsConnected}
          lastSyncAt={withingsConnection?.lastSyncAt?.toISOString() ?? null}
          recentEntries={serializedEntries}
        />
      </div>

      {/* Workout form */}
      <WorkoutForm initialExercises={exercises} />
    </div>
  );
}
