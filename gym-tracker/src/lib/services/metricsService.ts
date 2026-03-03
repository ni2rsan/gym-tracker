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
  const [latestWeight, latestBodyFat] = await Promise.all([
    prisma.bodyMetricEntry.findFirst({
      where: { userId, weightKg: { not: null } },
      orderBy: { recordedAt: "desc" },
      select: { weightKg: true, recordedAt: true },
    }),
    prisma.bodyMetricEntry.findFirst({
      where: { userId, bodyFatPct: { not: null } },
      orderBy: { recordedAt: "desc" },
      select: { bodyFatPct: true, recordedAt: true },
    }),
  ]);
  return {
    weightKg: latestWeight?.weightKg ?? null,
    bodyFatPct: latestBodyFat?.bodyFatPct ?? null,
    recordedAt: latestWeight?.recordedAt ?? latestBodyFat?.recordedAt ?? null,
  };
}
