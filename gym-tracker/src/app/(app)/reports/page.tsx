import { ReportsGuide } from "@/components/guide/ReportsGuide";
import { Suspense } from "react";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { getWeightTrendData, getExerciseStatCards } from "@/lib/services/reportService";
import { getLatestBodyMetric, getLastNBodyMetrics, getLatestWithingsMetric, getRangeAgoMetrics, getUserHeightCm } from "@/lib/services/metricsService";
import { syncWithingsIfNeeded, getWithingsConnection } from "@/lib/services/withingsService";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { WeightTrendChart } from "@/components/reports/WeightTrendChart";
import { ReportFilters } from "@/components/reports/ReportFilters";
import { MetricsCards } from "@/components/metrics/MetricsCards";
import { WithingsPanel } from "@/components/metrics/WithingsPanel";
import { WithingsToast } from "@/components/reports/WithingsToast";
import { ExerciseStatsPanel } from "@/components/reports/ExerciseStatsPanel";
import type { TimeRange } from "@/types";

export const metadata = { title: "Stats — Gym Tracker" };
export const dynamic = "force-dynamic";

interface ReportsPageProps {
  searchParams: Promise<{ range?: string }>;
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const params = await searchParams;

  const range: TimeRange =
    params.range === "week" || params.range === "month" || params.range === "year"
      ? params.range
      : "month";

  const userId = await getCurrentUserId();

  await syncWithingsIfNeeded(userId);

  const [weightTrend, latestMetric, recentEntries, withingsConnection, latestWithings, rangeAgoMetric, heightCm, exerciseCards] = await Promise.all([
    getWeightTrendData(userId, range),
    getLatestBodyMetric(userId),
    getLastNBodyMetrics(userId, 7),
    getWithingsConnection(userId),
    getLatestWithingsMetric(userId),
    getRangeAgoMetrics(userId, range),
    getUserHeightCm(userId),
    getExerciseStatCards(userId),
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

  return (
    <>
      <ReportsGuide />
      <div className="space-y-6">
        <Suspense><WithingsToast /></Suspense>

        {/* Page header + time range */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Stats</h1>
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
              currentFatMassKg={recentEntries[0]?.fatMassKg ?? null}
              currentMuscleMassKg={recentEntries[0]?.muscleMassKg ?? null}
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

        {/* Weight trend chart */}
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

        {/* Exercise personal records */}
        {exerciseCards.length > 0 && (
          <div className="space-y-2">
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-white">Exercises</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Latest session · delta vs previous · tap to expand
              </p>
            </div>
            <ExerciseStatsPanel cards={exerciseCards} />
          </div>
        )}
      </div>
    </>
  );
}
