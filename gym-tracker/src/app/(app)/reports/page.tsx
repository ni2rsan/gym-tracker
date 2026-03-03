import { Suspense } from "react";
import { getCurrentUserId } from "@/lib/auth-helpers";
import {
  getWeightTrendData,
  getMultiExerciseProgressData,
  getPersonalRecords,
} from "@/lib/services/reportService";
import { getExercisesForUser } from "@/lib/services/exerciseService";
import { getLatestBodyMetric } from "@/lib/services/metricsService";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { WeightTrendChart } from "@/components/reports/WeightTrendChart";
import { ExerciseProgressChart } from "@/components/reports/ExerciseProgressChart";
import { PRCards } from "@/components/reports/PRCards";
import { ReportFilters } from "@/components/reports/ReportFilters";
import { ExerciseFilter } from "@/components/reports/ExerciseFilter";
import { formatWeight, formatPct } from "@/lib/utils";
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

  // Single selected category — default to UPPER_BODY
  const selectedCategory: MuscleGroup = VALID_CATS.includes(params.cat as MuscleGroup)
    ? (params.cat as MuscleGroup)
    : "UPPER_BODY";

  // Refinement: specific exercise IDs within the selected category (empty = show all)
  const selectedExerciseIds: string[] = params.exIds
    ? params.exIds.split(",").filter(Boolean)
    : [];

  const userId = await getCurrentUserId();

  const [exercises, weightTrend, prs, latestMetric] = await Promise.all([
    getExercisesForUser(userId),
    getWeightTrendData(userId, range),
    getPersonalRecords(userId),
    getLatestBodyMetric(userId),
  ]);

  // Chart = refined exercises if any selected, otherwise all in the category
  const categoryExerciseIds = exercises
    .filter((e) => e.muscleGroup === selectedCategory)
    .map((e) => e.id);

  const allExerciseIdsToShow =
    selectedExerciseIds.length > 0
      ? selectedExerciseIds.filter((id) => categoryExerciseIds.includes(id))
      : categoryExerciseIds;

  const exerciseSeries = await getMultiExerciseProgressData(userId, allExerciseIdsToShow, range);

  return (
    <div className="space-y-6">
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

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardBody>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
              Current Weight
            </p>
            <p className="text-xl font-bold text-zinc-900 dark:text-white mt-1">
              {latestMetric?.weightKg ? formatWeight(Number(latestMetric.weightKg)) : "—"}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
              Body Fat
            </p>
            <p className="text-xl font-bold text-zinc-900 dark:text-white mt-1">
              {latestMetric?.bodyFatPct ? formatPct(Number(latestMetric.bodyFatPct)) : "—"}
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Weight & Body Fat Trend */}
      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
            Weight & Body Fat Trend
          </h2>
        </CardHeader>
        <CardBody>
          <WeightTrendChart data={weightTrend} />
        </CardBody>
      </Card>

      {/* Exercise Progress — filter sits directly above chart */}
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

      {/* Personal Records */}
      <div>
        <h2 className="text-base font-semibold text-zinc-900 dark:text-white mb-3">
          Personal Records
        </h2>
        <PRCards prs={prs} />
      </div>
    </div>
  );
}
