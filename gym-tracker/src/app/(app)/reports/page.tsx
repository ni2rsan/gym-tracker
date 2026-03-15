import { ReportsGuide } from "@/components/guide/ReportsGuide";
import { Suspense } from "react";
import { getCurrentUserId } from "@/lib/auth-helpers";
import {
  getWeightTrendData,
  getMultiExerciseProgressData,
} from "@/lib/services/reportService";
import { getExercisesForUser } from "@/lib/services/exerciseService";
import { getLatestBodyMetric, getLastNBodyMetrics, getLatestWithingsMetric, getRangeAgoMetrics, getUserHeightCm } from "@/lib/services/metricsService";
import { syncWithingsIfNeeded, getWithingsConnection } from "@/lib/services/withingsService";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { WeightTrendChart } from "@/components/reports/WeightTrendChart";
import { ExerciseProgressChart } from "@/components/reports/ExerciseProgressChart";
import { ReportFilters } from "@/components/reports/ReportFilters";
import { ExerciseFilter } from "@/components/reports/ExerciseFilter";
import { MetricsCards } from "@/components/metrics/MetricsCards";
import { WithingsPanel } from "@/components/metrics/WithingsPanel";
import { WithingsToast } from "@/components/reports/WithingsToast";
import type { TimeRange, MuscleGroup } from "@/types";

export const metadata = { title: "Reports — Gym Tracker" };
export const dynamic = "force-dynamic";

const VALID_CATS: MuscleGroup[] = ["UPPER_BODY", "LOWER_BODY", "BODYWEIGHT"];

interface ReportsPageProps {
  searchParams: Promise<{
    range?: string;
    cat?: string;
    exIds?: string;
  }>;
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const params = await searchParams;

  const range: TimeRange =
    params.range === "week" || params.range === "month" || params.range === "year"
      ? params.range
      : "month";

  const selectedCategory: MuscleGroup = VALID_CATS.includes(params.cat as MuscleGroup)
    ? (params.cat as MuscleGroup)
    : "UPPER_BODY";

  const selectedExerciseIds: string[] = params.exIds
    ? params.exIds.split(",").filter(Boolean)
    : [];

  const userId = await getCurrentUserId();

  // Sync Withings data before loading the page (no-op if not connected)
  await syncWithingsIfNeeded(userId);

  const [exercises, weightTrend, latestMetric, recentEntries, withingsConnection, latestWithings, rangeAgoMetric, heightCm] = await Promise.all([
    getExercisesForUser(userId),
    getWeightTrendData(userId, range),
    getLatestBodyMetric(userId),
    getLastNBodyMetrics(userId, 7),
    getWithingsConnection(userId),
    getLatestWithingsMetric(userId),
    getRangeAgoMetrics(userId, range),
    getUserHeightCm(userId),
  ]);

  const RANGE_LABELS: Record<typeof range, string> = { week: "7d", month: "30d", year: "1yr" };
  const rangeLabel = RANGE_LABELS[range];

  const isWithingsConnected = !!(withingsConnection?.isActive);

  const serializedEntries = recentEntries.map((e) => ({
    date: e.date,
    weightKg: e.weightKg !== null ? e.weightKg.toFixed(1) : null,
    bodyFatPct: e.bodyFatPct !== null ? e.bodyFatPct.toFixed(1) : null,
    fatMassKg: e.fatMassKg !== null ? e.fatMassKg.toFixed(1) : null,
    muscleMassKg: e.muscleMassKg !== null ? e.muscleMassKg.toFixed(1) : null,
    recordedAt: e.recordedAt.toISOString(),
    source: e.source,
  }));

  const categoryExerciseIds = exercises
    .filter((e) => e.muscleGroup === selectedCategory)
    .map((e) => e.id);

  const allExerciseIdsToShow =
    selectedExerciseIds.length > 0
      ? selectedExerciseIds.filter((id) => categoryExerciseIds.includes(id))
      : categoryExerciseIds;

  const exerciseSeries = await getMultiExerciseProgressData(userId, allExerciseIdsToShow, range);

  return (
    <>
      <ReportsGuide />
      <div className="space-y-6">
      <Suspense><WithingsToast /></Suspense>
      {/* Page header + time range */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Reports</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Track your progress over time.
          </p>
        </div>
        <Suspense>
          <ReportFilters range={range} />
        </Suspense>
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
            rangeAgoWeight={rangeAgoMetric.weightKg}
            rangeAgoBodyFat={rangeAgoMetric.bodyFatPct}
            rangeAgoFatMassKg={rangeAgoMetric.fatMassKg}
            rangeAgoMuscleMassKg={rangeAgoMetric.muscleMassKg}
            rangeLabel={rangeLabel}
            isWithingsConnected={isWithingsConnected}
            heightCm={heightCm}
          />
        </Suspense>

        <WithingsPanel
          isConnected={isWithingsConnected}
          lastSyncAt={withingsConnection?.lastSyncAt?.toISOString() ?? null}
          recentEntries={serializedEntries}
        />
      </div>

      {/* Weight & Body Fat Trend */}
      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
            Weight & Body Fat Trend
          </h2>
        </CardHeader>
        <CardBody>
          <WeightTrendChart data={weightTrend} isWithingsConnected={isWithingsConnected} />
        </CardBody>
      </Card>

      {/* Exercise Progress */}
      <Card>
        <CardHeader className="flex-col items-start gap-3">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
            Exercise Progress
          </h2>
          <Suspense>
            <ExerciseFilter
              exercises={exercises}
              selectedCategory={selectedCategory}
              selectedExerciseIds={selectedExerciseIds}
            />
          </Suspense>
        </CardHeader>
        <CardBody>
          <ExerciseProgressChart series={exerciseSeries} />
        </CardBody>
      </Card>

    </div>
    </>
  );
}
