import { prisma } from "@/lib/prisma";
import type { BlockType as BlockTypeEnum, SeriesRuleType as SeriesRuleTypeEnum } from "@/generated/prisma/client";

export type { BlockTypeEnum, SeriesRuleTypeEnum };

// ─── Read ──────────────────────────────────────────────────────────────────

export async function getPlannedWorkoutsInRange(
  userId: string,
  startDate: string,
  endDate: string
) {
  return prisma.plannedWorkout.findMany({
    where: {
      userId,
      date: { gte: new Date(startDate + "T12:00:00"), lte: new Date(endDate + "T12:00:00") },
    },
    orderBy: { date: "asc" },
    select: {
      id: true,
      date: true,
      blockType: true,
      seriesId: true,
    },
  });
}

export async function getWorkedOutDates(
  userId: string,
  startDate: string,
  endDate: string
): Promise<Set<string>> {
  const sessions = await prisma.workoutSession.findMany({
    where: {
      userId,
      date: { gte: new Date(startDate + "T12:00:00"), lte: new Date(endDate + "T12:00:00") },
    },
    select: { date: true },
  });
  return new Set(sessions.map((s) => {
    const d = s.date;
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }));
}

export async function getWorkoutSummaryForDate(userId: string, date: string) {
  const session = await prisma.workoutSession.findFirst({
    where: { userId, date: new Date(date + "T12:00:00") },
    select: {
      id: true,
      sets: {
        select: { exerciseId: true, reps: true, weightKg: true },
      },
    },
  });
  if (!session) return null;
  const exerciseIds = [...new Set(session.sets.map((s) => s.exerciseId))];
  return { totalSets: session.sets.length, exerciseCount: exerciseIds.length };
}

// ─── Create ────────────────────────────────────────────────────────────────

export async function createOneOffBlock(
  userId: string,
  date: string,
  blockType: BlockTypeEnum
) {
  return prisma.plannedWorkout.create({
    data: { userId, date: new Date(date + "T12:00:00"), blockType },
  });
}

interface SeriesConfig {
  blockType: BlockTypeEnum;
  ruleType: SeriesRuleTypeEnum;
  weekdays: number[];
  intervalDays?: number;
  startDate: string;
}

function generateDatesForSeries(config: SeriesConfig): Date[] {
  const dates: Date[] = [];
  const start = new Date(config.startDate + "T12:00:00");
  const end = new Date(start);
  end.setFullYear(end.getFullYear() + 1);

  if (config.ruleType === "WEEKDAYS" && config.weekdays.length > 0) {
    const cursor = new Date(start);
    while (cursor <= end) {
      // getDay(): 0=Sun,1=Mon,...,6=Sat → convert to ISO 1=Mon...7=Sun
      const isoDay = cursor.getDay() === 0 ? 7 : cursor.getDay();
      if (config.weekdays.includes(isoDay)) {
        dates.push(new Date(cursor));
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  } else if (config.ruleType === "INTERVAL" && config.intervalDays && config.intervalDays > 0) {
    const cursor = new Date(start);
    while (cursor <= end) {
      dates.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + config.intervalDays);
    }
  }

  return dates;
}

export async function createSeries(userId: string, config: SeriesConfig) {
  const series = await prisma.plannedWorkoutSeries.create({
    data: {
      userId,
      blockType: config.blockType,
      ruleType: config.ruleType,
      weekdays: config.weekdays,
      intervalDays: config.intervalDays ?? null,
      startDate: new Date(config.startDate + "T12:00:00"),
    },
  });

  const dates = generateDatesForSeries(config);
  if (dates.length > 0) {
    await prisma.plannedWorkout.createMany({
      data: dates.map((date) => ({
        userId,
        date,
        blockType: config.blockType,
        seriesId: series.id,
      })),
    });
  }

  return { series, count: dates.length };
}

// ─── Delete ────────────────────────────────────────────────────────────────

export async function deleteBlock(userId: string, blockId: string) {
  await prisma.plannedWorkout.deleteMany({
    where: { id: blockId, userId },
  });
}

export async function deleteSeries(
  userId: string,
  seriesId: string,
  fromDate?: string
) {
  const where = fromDate
    ? { seriesId, userId, date: { gte: new Date(fromDate) } }
    : { seriesId, userId };

  await prisma.plannedWorkout.deleteMany({ where });

  // If deleting all, also remove the series record
  if (!fromDate) {
    await prisma.plannedWorkoutSeries.deleteMany({
      where: { id: seriesId, userId },
    });
  }
}

// ─── Update ────────────────────────────────────────────────────────────────

export async function updateBlock(
  userId: string,
  blockId: string,
  blockType: BlockTypeEnum
) {
  return prisma.plannedWorkout.updateMany({
    where: { id: blockId, userId },
    data: { blockType },
  });
}

export async function updateSeries(
  userId: string,
  seriesId: string,
  config: SeriesConfig
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Delete future instances
  await prisma.plannedWorkout.deleteMany({
    where: { seriesId, userId, date: { gte: today } },
  });

  // Update series config
  await prisma.plannedWorkoutSeries.updateMany({
    where: { id: seriesId, userId },
    data: {
      blockType: config.blockType,
      ruleType: config.ruleType,
      weekdays: config.weekdays,
      intervalDays: config.intervalDays ?? null,
      startDate: new Date(config.startDate + "T12:00:00"),
    },
  });

  // Regenerate from today
  const regenerateConfig = { ...config, startDate: today.toISOString().split("T")[0] };
  const dates = generateDatesForSeries(regenerateConfig);
  if (dates.length > 0) {
    await prisma.plannedWorkout.createMany({
      data: dates.map((date) => ({
        userId,
        date,
        blockType: config.blockType,
        seriesId,
      })),
    });
  }
}
