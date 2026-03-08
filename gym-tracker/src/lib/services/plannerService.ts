import { prisma } from "@/lib/prisma";
import type { BlockType as BlockTypeEnum, SeriesRuleType as SeriesRuleTypeEnum } from "@/generated/prisma/client";

// Local date helpers (use local date parts, not UTC, for "today")
function localTodayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// For DB dates stored at T12:00:00Z, use UTC parts
function dbDateToISO(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

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
      sorryExcused: true,
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

/** Returns a map of date → muscle groups that have exercises saved for that date. */
export async function getTrackedGroupsByDate(
  userId: string,
  startDate: string,
  endDate: string
): Promise<Record<string, string[]>> {
  const sessions = await prisma.workoutSession.findMany({
    where: {
      userId,
      date: { gte: new Date(startDate + "T12:00:00"), lte: new Date(endDate + "T12:00:00") },
    },
    select: {
      date: true,
      sets: { select: { exercise: { select: { muscleGroup: true } } } },
    },
  });
  const result: Record<string, Set<string>> = {};
  for (const session of sessions) {
    const iso = dbDateToISO(session.date);
    if (!result[iso]) result[iso] = new Set();
    for (const set of session.sets) {
      result[iso].add(set.exercise.muscleGroup as string);
    }
  }
  return Object.fromEntries(Object.entries(result).map(([k, v]) => [k, [...v]]));
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

  // Regenerate all dates from config.startDate (may be in the past)
  const allDates = generateDatesForSeries(config);
  const futureDates = allDates.filter((d) => d >= today);
  const pastDates = allDates.filter((d) => d < today);

  // Future dates: already deleted above, safe to insert directly
  if (futureDates.length > 0) {
    await prisma.plannedWorkout.createMany({
      data: futureDates.map((date) => ({ userId, date, blockType: config.blockType, seriesId })),
    });
  }

  // Past dates: only insert ones not already present (no unique constraint, must check manually)
  if (pastDates.length > 0) {
    const existing = await prisma.plannedWorkout.findMany({
      where: { seriesId, userId, date: { lt: today } },
      select: { date: true },
    });
    const existingISOs = new Set(existing.map((e) => dbDateToISO(e.date)));
    const missing = pastDates.filter((d) => !existingISOs.has(dbDateToISO(d)));
    if (missing.length > 0) {
      await prisma.plannedWorkout.createMany({
        data: missing.map((date) => ({ userId, date, blockType: config.blockType, seriesId })),
      });
    }
  }
}

// ─── Streak ────────────────────────────────────────────────────────────────

export interface StreakEntry {
  seriesId: string;
  blockType: string;
  count: number;
}

export interface StreakData {
  streaks: StreakEntry[];
  sorryUsed: number;
  sorryRemaining: number;
  month: string; // "YYYY-MM"
}

async function incrementSorryToken(userId: string, month: string): Promise<void> {
  await prisma.userSorryToken.upsert({
    where: { userId_month: { userId, month } },
    create: { userId, month, usedCount: 1 },
    update: { usedCount: { increment: 1 } },
  });
}

export async function getSorryTokensThisMonth(userId: string): Promise<{ usedCount: number; month: string }> {
  const d = new Date();
  const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const token = await prisma.userSorryToken.findUnique({
    where: { userId_month: { userId, month } },
  });
  return { usedCount: token?.usedCount ?? 0, month };
}

export async function getStreakData(userId: string): Promise<StreakData> {
  const d = new Date();
  const todayISO = localTodayISO();
  const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  // SORRY tokens
  const sorryToken = await prisma.userSorryToken.findUnique({
    where: { userId_month: { userId, month } },
  });
  const sorryUsed = sorryToken?.usedCount ?? 0;

  // Active series: has any instance in past 60 days or in the future
  const sixtyDaysAgo = new Date(d);
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  const allSeries = await prisma.plannedWorkoutSeries.findMany({
    where: {
      userId,
      workouts: { some: { date: { gte: sixtyDaysAgo } } },
    },
    select: { id: true, blockType: true, startDate: true, streakResetDate: true },
  });

  if (allSeries.length === 0) {
    return { streaks: [], sorryUsed, sorryRemaining: Math.max(0, 3 - sorryUsed), month };
  }

  // Fetch worked-out dates covering all series
  const earliestStart = allSeries.reduce(
    (min, s) => (s.startDate < min ? s.startDate : min),
    allSeries[0].startDate
  );
  const workedOutDates = await getWorkedOutDates(userId, dbDateToISO(earliestStart), todayISO);

  // Compute yesterday ISO
  const yesterday = new Date(d);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayISO = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;

  const streaks: StreakEntry[] = [];

  for (const series of allSeries) {
    const cutoffDate = series.streakResetDate && series.streakResetDate > series.startDate
      ? series.streakResetDate
      : series.startDate;
    const cutoffISO = dbDateToISO(cutoffDate);

    if (yesterdayISO < cutoffISO) {
      // Series started today or cutoff is in the future — no past data yet
      streaks.push({ seriesId: series.id, blockType: series.blockType, count: 0 });
      continue;
    }

    // Fetch all past planned workouts for this series (including sorryExcused)
    const plannedWorkouts = await prisma.plannedWorkout.findMany({
      where: {
        seriesId: series.id,
        date: {
          gte: new Date(cutoffISO + "T12:00:00"),
          lte: new Date(yesterdayISO + "T12:00:00"),
        },
      },
      orderBy: { date: "desc" },
      select: { date: true, sorryExcused: true },
    });

    let streak = 0;
    for (const pw of plannedWorkouts) {
      const dateISO = dbDateToISO(pw.date);
      if (pw.sorryExcused) continue; // neutral — skip, don't count, don't break
      if (workedOutDates.has(dateISO)) {
        streak++;
      } else {
        break; // streak broken here
      }
    }

    streaks.push({ seriesId: series.id, blockType: series.blockType, count: streak });
  }

  return { streaks, sorryUsed, sorryRemaining: Math.max(0, 3 - sorryUsed), month };
}

// ─── SORRY token operations ────────────────────────────────────────────────

/** Soft-delete a series block via SORRY token (marks sorryExcused=true, keeps streak) */
export async function applySorryAndSoftDeleteBlock(userId: string, blockId: string): Promise<void> {
  const d = new Date();
  const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  await prisma.plannedWorkout.updateMany({
    where: { id: blockId, userId },
    data: { sorryExcused: true },
  });

  await incrementSorryToken(userId, month);
}

/** Hard-delete a series block and reset the series streak */
export async function deleteBlockWithReset(userId: string, blockId: string): Promise<void> {
  const block = await prisma.plannedWorkout.findFirst({
    where: { id: blockId, userId },
    select: { seriesId: true },
  });

  await prisma.plannedWorkout.deleteMany({ where: { id: blockId, userId } });

  if (block?.seriesId) {
    const todayStr = localTodayISO();
    await prisma.plannedWorkoutSeries.updateMany({
      where: { id: block.seriesId, userId },
      data: { streakResetDate: new Date(todayStr + "T12:00:00") },
    });
  }
}

/** Update series config + consume a SORRY token (preserves streak) */
export async function updateSeriesWithSorry(
  userId: string,
  seriesId: string,
  config: SeriesConfig
): Promise<void> {
  await updateSeries(userId, seriesId, config);
  const d = new Date();
  const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  await incrementSorryToken(userId, month);
}

/** Excuse all missed blocks on a date using one sorry token */
export async function excuseMissedDay(userId: string, date: string): Promise<void> {
  const d = new Date();
  const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  await prisma.plannedWorkout.updateMany({
    where: {
      userId,
      date: {
        gte: new Date(date + "T00:00:00Z"),
        lte: new Date(date + "T23:59:59Z"),
      },
    },
    data: { sorryExcused: true },
  });

  await incrementSorryToken(userId, month);
}

/** Revoke a sorry excuse on a date (today/future only — reversible) */
export async function revokeSorryExcuse(userId: string, date: string): Promise<void> {
  const d = new Date();
  const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  await prisma.plannedWorkout.updateMany({
    where: {
      userId,
      date: {
        gte: new Date(date + "T00:00:00Z"),
        lte: new Date(date + "T23:59:59Z"),
      },
    },
    data: { sorryExcused: false },
  });

  const token = await prisma.userSorryToken.findUnique({
    where: { userId_month: { userId, month } },
  });
  if (token && token.usedCount > 0) {
    await prisma.userSorryToken.update({
      where: { userId_month: { userId, month } },
      data: { usedCount: token.usedCount - 1 },
    });
  }
}

/** Update series config + reset its streak */
export async function updateSeriesWithReset(
  userId: string,
  seriesId: string,
  config: SeriesConfig
): Promise<void> {
  await updateSeries(userId, seriesId, config);
  const todayStr = localTodayISO();
  await prisma.plannedWorkoutSeries.updateMany({
    where: { id: seriesId, userId },
    data: { streakResetDate: new Date(todayStr + "T12:00:00") },
  });
}
