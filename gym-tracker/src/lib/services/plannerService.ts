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
      sets: { some: {} },
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
  sorryMax: number;         // user's configured max (1–5)
  canEditSorryMax: boolean; // false if already edited this calendar month
  month: string; // "YYYY-MM"
  generalStreak: number; // consecutive days worked out (today exempt — counts from yesterday back)
  bestStreak: number;    // longest consecutive run in the past year
  totalWorkoutsThisMonth: number;
  last30DaysWorkouts: string[]; // ISO dates with workouts in last 30 calendar days (oldest→newest)
  thisWeekWorkouts: string[];   // ISO dates with workouts Mon–Sun of current week
  plannedLast30: number;   // planned blocks in last 30 days
  completedLast30: number; // of those, worked out or sorry-excused
  plannedThisWeek: number;   // planned blocks Mon–Sun of current week
  completedThisWeek: number; // of those, worked out or sorry-excused
  thisWeekBlocksByDate: Record<string, string[]>; // date → blockTypes planned this week
  // All-time workout stats
  totalTracked: number;  // distinct dates worked out OR sorry-excused
  totalPlanned: number;  // distinct planned dates up to and including today
  totalMissed: number;   // planned dates before today not done and not sorry-excused
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

  // SORRY tokens + user-configured max + all-time stats
  const [sorryToken, userPrefs, allTimeSessionDates, allTimePlannedRaw] = await Promise.all([
    prisma.userSorryToken.findUnique({ where: { userId_month: { userId, month } } }),
    prisma.user.findUnique({ where: { id: userId }, select: { sorryTokenMax: true, sorryTokenMaxEditedMonth: true } }),
    prisma.workoutSession.findMany({ where: { userId, sets: { some: {} } }, select: { date: true } }),
    // Include today — planned today counts as "planned so far"
    prisma.plannedWorkout.findMany({ where: { userId, date: { lte: new Date(todayISO + "T23:59:59") } }, select: { date: true, sorryExcused: true } }),
  ]);

  // All-time workout stats — all counts use distinct dates for apples-to-apples comparison
  const allTimeWorkedSet = new Set(allTimeSessionDates.map((s) => {
    const sd = s.date; return `${sd.getUTCFullYear()}-${String(sd.getUTCMonth() + 1).padStart(2, "0")}-${String(sd.getUTCDate()).padStart(2, "0")}`;
  }));
  // Count planned BLOCKS (not distinct dates) — some days have 2 blocks (upper + lower)
  const totalPlanned = allTimePlannedRaw.length;
  // Tracked = planned blocks that were completed (session on that date OR sorry-excused)
  const totalTracked = allTimePlannedRaw.filter((pw) => {
    const dateISO = dbDateToISO(pw.date);
    return pw.sorryExcused || allTimeWorkedSet.has(dateISO);
  }).length;
  // Missed = planned blocks before today that were NOT completed
  const totalMissed = allTimePlannedRaw.filter((pw) => {
    const dateISO = dbDateToISO(pw.date);
    return dateISO < todayISO && !pw.sorryExcused && !allTimeWorkedSet.has(dateISO);
  }).length;
  const sorryUsed = sorryToken?.usedCount ?? 0;
  const sorryMax = userPrefs?.sorryTokenMax ?? 3;
  const canEditSorryMax = userPrefs?.sorryTokenMaxEditedMonth !== month;

  // Fetch all workout dates for the past year (for general streak + this month count)
  const oneYearAgo = new Date(d);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const oneYearAgoISO = dbDateToISO(oneYearAgo);
  const allRecentWorkouts = await getWorkedOutDates(userId, oneYearAgoISO, todayISO);

  // Fetch all planned workout dates for the past year (used for plan-based streak + sorry dates)
  const allPlannedYearRaw = await prisma.plannedWorkout.findMany({
    where: {
      userId,
      date: {
        gte: new Date(oneYearAgoISO + "T00:00:00"),
        lte: new Date(todayISO + "T23:59:59"),
      },
    },
    select: { date: true, sorryExcused: true },
    orderBy: { date: "desc" },
  });
  const sorryDates = new Set(
    allPlannedYearRaw.filter((pw) => pw.sorryExcused).map((pw) => dbDateToISO(pw.date))
  );
  // Combined set: actual workouts + sorry-excused days both count as "done"
  const doneDates = new Set([...allRecentWorkouts, ...sorryDates]);

  // Unique planned dates (past year, deduplicated), sorted descending
  const uniquePlannedDatesDesc = [
    ...new Set(allPlannedYearRaw.map((pw) => dbDateToISO(pw.date))),
  ].sort().reverse();
  const plannedDatesSet = new Set(uniquePlannedDatesDesc);

  // General streak: consecutive PLANNED days completed, going backward from yesterday.
  // Today is exempt — you have until EOD to finish today's planned workout.
  const yesterdayCursor = new Date(d);
  yesterdayCursor.setDate(yesterdayCursor.getDate() - 1);
  const yesterdayISOStr = `${yesterdayCursor.getFullYear()}-${String(yesterdayCursor.getMonth() + 1).padStart(2, "0")}-${String(yesterdayCursor.getDate()).padStart(2, "0")}`;
  let generalStreak = 0;
  for (const iso of uniquePlannedDatesDesc) {
    if (iso > yesterdayISOStr) continue; // skip today
    if (doneDates.has(iso)) {
      generalStreak++;
    } else {
      break; // missed a planned day — streak ends
    }
  }
  // Add today if it's a planned day and already done
  if (plannedDatesSet.has(todayISO) && doneDates.has(todayISO)) generalStreak++;

  // Best streak: longest run of consecutive PLANNED days completed
  const uniquePlannedDatesAsc = [...uniquePlannedDatesDesc].reverse();
  let bestStreak = 0;
  let runLength = 0;
  for (const iso of uniquePlannedDatesAsc) {
    if (iso > todayISO) break; // ignore future planned days
    if (doneDates.has(iso)) {
      runLength++;
      if (runLength > bestStreak) bestStreak = runLength;
    } else if (iso < todayISO) {
      runLength = 0; // missed a past planned day — run ends
    }
    // iso === todayISO and not yet done: don't reset (today is still exempt)
  }

  // Total distinct completed days this month (workouts + sorry-excused planned days)
  const monthStart = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  let totalWorkoutsThisMonth = 0;
  for (const iso of doneDates) {
    if (iso >= monthStart && iso <= todayISO) totalWorkoutsThisMonth++;
  }

  // last30DaysWorkouts: ISO dates that had workouts in the last 30 calendar days
  const last30DaysWorkouts: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const cur = new Date(d); cur.setDate(cur.getDate() - i);
    const iso = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`;
    if (allRecentWorkouts.has(iso)) last30DaysWorkouts.push(iso);
  }

  // Consistency: planned blocks this month vs completed/excused
  const allPlannedLast30 = await prisma.plannedWorkout.findMany({
    where: {
      userId,
      date: {
        gte: new Date(monthStart + "T00:00:00"),
        lte: new Date(todayISO + "T23:59:59"),
      },
    },
    select: { date: true, sorryExcused: true },
  });
  const plannedLast30 = allPlannedLast30.length;
  const completedLast30 = allPlannedLast30.filter((pw) => {
    const iso = dbDateToISO(pw.date);
    return pw.sorryExcused || allRecentWorkouts.has(iso);
  }).length;

  // thisWeekWorkouts: ISO dates that had workouts Mon–Sun of current week
  const thisWeekWorkouts: string[] = [];
  const dow = d.getDay(); // 0=Sun
  const monday = new Date(d); monday.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  const weekIsos: string[] = [];
  for (let i = 0; i < 7; i++) {
    const cur = new Date(monday); cur.setDate(monday.getDate() + i);
    const iso = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`;
    weekIsos.push(iso);
    if (doneDates.has(iso)) thisWeekWorkouts.push(iso);
  }

  // Planned vs completed blocks this week
  const sundayISO = weekIsos[6];
  const allPlannedThisWeek = await prisma.plannedWorkout.findMany({
    where: {
      userId,
      date: {
        gte: new Date(weekIsos[0] + "T00:00:00"),
        lte: new Date(sundayISO + "T23:59:59"),
      },
    },
    select: { date: true, blockType: true, sorryExcused: true },
  });
  const plannedThisWeek = allPlannedThisWeek.length;
  const completedThisWeek = allPlannedThisWeek.filter((pw) => {
    const iso = dbDateToISO(pw.date);
    return pw.sorryExcused || allRecentWorkouts.has(iso);
  }).length;
  const thisWeekBlocksByDate: Record<string, string[]> = {};
  for (const pw of allPlannedThisWeek) {
    const iso = dbDateToISO(pw.date);
    if (!thisWeekBlocksByDate[iso]) thisWeekBlocksByDate[iso] = [];
    thisWeekBlocksByDate[iso].push(pw.blockType as string);
  }

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
    return { streaks: [], sorryUsed, sorryRemaining: Math.max(0, sorryMax - sorryUsed), sorryMax, canEditSorryMax, month, generalStreak, bestStreak, totalWorkoutsThisMonth, last30DaysWorkouts, thisWeekWorkouts, plannedLast30, completedLast30, plannedThisWeek, completedThisWeek, thisWeekBlocksByDate, totalTracked, totalPlanned, totalMissed };
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
      streaks.push({ seriesId: series.id, blockType: series.blockType, count: 0 });
      continue;
    }

    const plannedWorkouts = await prisma.plannedWorkout.findMany({
      where: {
        userId,
        blockType: series.blockType,
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
      if (pw.sorryExcused || workedOutDates.has(dateISO)) {
        streak++;
      } else {
        break;
      }
    }

    streaks.push({ seriesId: series.id, blockType: series.blockType, count: streak });
  }

  return { streaks, sorryUsed, sorryRemaining: Math.max(0, sorryMax - sorryUsed), sorryMax, canEditSorryMax, month, generalStreak, bestStreak, totalWorkoutsThisMonth, last30DaysWorkouts, thisWeekWorkouts, plannedLast30, completedLast30, plannedThisWeek, completedThisWeek, thisWeekBlocksByDate, totalTracked, totalPlanned, totalMissed };
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

/** Set the user's monthly SORRY token max (1–5). Once per calendar month. */
export async function setSorryTokenMax(userId: string, newMax: number): Promise<{ ok: boolean; error?: string }> {
  if (newMax < 1 || newMax > 5 || !Number.isInteger(newMax)) {
    return { ok: false, error: "Max must be between 1 and 5." };
  }
  const d = new Date();
  const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { sorryTokenMaxEditedMonth: true },
  });
  if (user?.sorryTokenMaxEditedMonth === month) {
    return { ok: false, error: "You can only change your SORRY token limit once per month." };
  }
  await prisma.user.update({
    where: { id: userId },
    data: { sorryTokenMax: newMax, sorryTokenMaxEditedMonth: month },
  });
  return { ok: true };
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
