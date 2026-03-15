// APPEND-ONLY: No update or delete operations are permitted on BodyMetricEntry rows.
import { prisma } from "@/lib/prisma";
import { getRangeStart } from "@/lib/utils";
import type { TimeRange } from "@/types";

export async function addBodyMetric(
  userId: string,
  data: { weightKg?: number | null; bodyFatPct?: number | null; notes?: string }
) {
  return prisma.bodyMetricEntry.create({
    data: {
      userId,
      weightKg: data.weightKg ?? null,
      bodyFatPct: data.bodyFatPct ?? null,
      notes: data.notes ?? null,
    },
  });
}

export async function getBodyMetrics(userId: string, range: TimeRange | "all" = "all") {
  const where =
    range === "all"
      ? { userId }
      : { userId, recordedAt: { gte: getRangeStart(range) } };

  return prisma.bodyMetricEntry.findMany({
    where,
    orderBy: { recordedAt: "asc" },
    select: {
      id: true,
      weightKg: true,
      bodyFatPct: true,
      recordedAt: true,
      notes: true,
    },
  });
}

export async function getLatestBodyMetric(userId: string) {
  const [latestWeight, latestBodyFat, latestFatMass, latestMuscleMass] = await Promise.all([
    prisma.bodyMetricEntry.findFirst({
      where: { userId, weightKg: { not: null } },
      orderBy: { recordedAt: "desc" },
      select: { weightKg: true, recordedAt: true, source: true },
    }),
    prisma.bodyMetricEntry.findFirst({
      where: { userId, bodyFatPct: { not: null } },
      orderBy: { recordedAt: "desc" },
      select: { bodyFatPct: true, recordedAt: true, source: true },
    }),
    prisma.bodyMetricEntry.findFirst({
      where: { userId, fatMassKg: { not: null } },
      orderBy: { recordedAt: "desc" },
      select: { fatMassKg: true },
    }),
    prisma.bodyMetricEntry.findFirst({
      where: { userId, muscleMassKg: { not: null } },
      orderBy: { recordedAt: "desc" },
      select: { muscleMassKg: true },
    }),
  ]);
  return {
    weightKg: latestWeight?.weightKg ?? null,
    bodyFatPct: latestBodyFat?.bodyFatPct ?? null,
    fatMassKg: latestFatMass?.fatMassKg ?? null,
    muscleMassKg: latestMuscleMass?.muscleMassKg ?? null,
    recordedAt: latestWeight?.recordedAt ?? latestBodyFat?.recordedAt ?? null,
    weightSource: latestWeight?.source ?? null,
    bodyFatSource: latestBodyFat?.source ?? null,
  };
}

/** Returns averaged metrics from the day closest to the start of the given range */
export async function getRangeAgoMetrics(userId: string, range: TimeRange) {
  const cutoff = getRangeStart(range);
  // Use end-of-day so measurements taken later in the boundary day are included
  cutoff.setHours(23, 59, 59, 999);
  return _getMetricsAtOrBefore(userId, cutoff);
}

/** @deprecated Use getRangeAgoMetrics instead */
export async function getWeekAgoMetrics(userId: string) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return _getMetricsAtOrBefore(userId, sevenDaysAgo);
}

async function _getMetricsAtOrBefore(userId: string, cutoff: Date) {
  const rows = await prisma.bodyMetricEntry.findMany({
    where: { userId, recordedAt: { lte: cutoff } },
    orderBy: { recordedAt: "desc" },
    take: 50,
    select: { weightKg: true, bodyFatPct: true, fatMassKg: true, muscleMassKg: true, recordedAt: true },
  });

  if (rows.length === 0) return { weightKg: null, bodyFatPct: null, fatMassKg: null, muscleMassKg: null };

  // Group by calendar date, take the most recent day (closest to 7 days ago)
  const byDate = new Map<string, typeof rows>();
  for (const row of rows) {
    const key = row.recordedAt.toISOString().slice(0, 10);
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(row);
  }

  function avgNonNull(vals: ({ toString(): string } | null)[]): number | null {
    const nums = vals.filter((v) => v !== null).map((v) => Number(v!));
    if (nums.length === 0) return null;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
  }

  const [, entries] = [...byDate.entries()].sort((a, b) => b[0].localeCompare(a[0]))[0];
  return {
    weightKg: avgNonNull(entries.map((e) => e.weightKg)),
    bodyFatPct: avgNonNull(entries.map((e) => e.bodyFatPct)),
    fatMassKg: avgNonNull(entries.map((e) => e.fatMassKg)),
    muscleMassKg: avgNonNull(entries.map((e) => e.muscleMassKg)),
  };
}

/** Returns the latest Withings-sourced weight and body fat for use in the "Revert to Withings" button */
export async function getLatestWithingsMetric(userId: string) {
  const [weight, bodyFat] = await Promise.all([
    prisma.bodyMetricEntry.findFirst({
      where: { userId, weightKg: { not: null }, source: "withings" },
      orderBy: { recordedAt: "desc" },
      select: { weightKg: true },
    }),
    prisma.bodyMetricEntry.findFirst({
      where: { userId, bodyFatPct: { not: null }, source: "withings" },
      orderBy: { recordedAt: "desc" },
      select: { bodyFatPct: true },
    }),
  ]);
  return {
    weightKg: weight?.weightKg ?? null,
    bodyFatPct: bodyFat?.bodyFatPct ?? null,
  };
}

export async function getUserHeightCm(userId: string): Promise<number | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { heightCm: true },
  });
  return user?.heightCm ?? null;
}

export async function deleteBodyMetricEntry(userId: string, entryId: string): Promise<void> {
  await prisma.bodyMetricEntry.deleteMany({
    where: { id: entryId, userId },
  });
}

/** Returns the last N daily-averaged body metric entries for a user, newest first */
export async function getLastNBodyMetrics(userId: string, n: number) {
  const rows = await prisma.bodyMetricEntry.findMany({
    where: { userId },
    orderBy: { recordedAt: "desc" },
    take: n * 20, // fetch extra to ensure N distinct days after grouping
    select: {
      weightKg: true,
      bodyFatPct: true,
      fatMassKg: true,
      muscleMassKg: true,
      recordedAt: true,
      source: true,
    },
  });

  // Group by calendar date, then average each metric across same-day entries
  const byDate = new Map<string, typeof rows>();
  for (const row of rows) {
    const key = row.recordedAt.toISOString().slice(0, 10);
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(row);
  }

  function avgNonNull(vals: ({ toString(): string } | null)[]): number | null {
    const nums = vals.filter((v) => v !== null).map((v) => Number(v!));
    if (nums.length === 0) return null;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
  }

  return [...byDate.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, n)
    .map(([date, entries]) => ({
      date,
      recordedAt: new Date(date + "T12:00:00Z"),
      weightKg: avgNonNull(entries.map((e) => e.weightKg)),
      bodyFatPct: avgNonNull(entries.map((e) => e.bodyFatPct)),
      fatMassKg: avgNonNull(entries.map((e) => e.fatMassKg)),
      muscleMassKg: avgNonNull(entries.map((e) => e.muscleMassKg)),
      source: entries.some((e) => e.source === "withings") ? "withings" : (entries[0]?.source ?? null),
    }));
}
