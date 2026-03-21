import { prisma } from "@/lib/prisma";
import { MuscleGroup } from "@/generated/prisma/client";
import type { PRRecord } from "@/types";
import type { UserBadge } from "@/constants/badges";
import { BADGE_CATALOG } from "@/constants/badges";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WeeklyVolumeComparison {
  thisWeekKg: number;
  lastWeekKg: number;
  changeKg: number;
  changePct: number;
}

export interface BiggestJumpResult {
  exerciseId: string;
  exerciseName: string;
  previousBest: number;
  currentBest: number;
  absoluteJump: number;
  percentJump: number;
  isAssisted: boolean;
}

export interface TrainingBalance {
  upperBody: { sets: number; pct: number };
  lowerBody: { sets: number; pct: number };
  bodyweight: { sets: number; pct: number };
  total: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMonday(ref: Date): Date {
  const d = new Date(ref);
  const dow = d.getDay();
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

function toISO(d: Date): string {
  return d.toISOString().split("T")[0];
}

function isAssistedExercise(name: string): boolean {
  return name.toUpperCase().startsWith("ASSISTED");
}

// ─── Weekly Volume Comparison ─────────────────────────────────────────────────

export async function getWeeklyVolumeComparison(userId: string): Promise<WeeklyVolumeComparison> {
  const now = new Date();
  const thisMon = getMonday(now);
  const lastMon = new Date(thisMon);
  lastMon.setDate(lastMon.getDate() - 7);
  const nextMon = new Date(thisMon);
  nextMon.setDate(nextMon.getDate() + 7);

  const sessions = await prisma.workoutSession.findMany({
    where: { userId, date: { gte: lastMon, lt: nextMon } },
    include: {
      sets: {
        include: { exercise: { select: { muscleGroup: true, isBodyweight: true } } },
      },
    },
  });

  let thisWeekKg = 0;
  let lastWeekKg = 0;

  for (const session of sessions) {
    const sessionDate = session.date;
    const isThisWeek = sessionDate >= thisMon;

    // Deduplicate: latest set per setNumber per exercise
    const byExercise: Record<string, Record<number, typeof session.sets[0]>> = {};
    const sorted = [...session.sets].sort(
      (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
    );
    for (const set of sorted) {
      if (!byExercise[set.exerciseId]) byExercise[set.exerciseId] = {};
      if (!byExercise[set.exerciseId][set.setNumber]) {
        byExercise[set.exerciseId][set.setNumber] = set;
      }
    }

    for (const exSets of Object.values(byExercise)) {
      for (const set of Object.values(exSets)) {
        // Skip bodyweight and cardio
        if (set.exercise.isBodyweight || set.exercise.muscleGroup === MuscleGroup.CARDIO) continue;
        const weight = set.weightKg ? Number(set.weightKg) : 0;
        if (weight > 0) {
          const vol = weight * set.reps;
          if (isThisWeek) thisWeekKg += vol;
          else lastWeekKg += vol;
        }
      }
    }
  }

  const changeKg = thisWeekKg - lastWeekKg;
  const changePct = lastWeekKg > 0 ? (changeKg / lastWeekKg) * 100 : 0;

  return {
    thisWeekKg: Math.round(thisWeekKg),
    lastWeekKg: Math.round(lastWeekKg),
    changeKg: Math.round(changeKg),
    changePct: Math.round(changePct),
  };
}

// ─── Biggest Jump (30 days) ───────────────────────────────────────────────────

export async function getBiggestJump(userId: string, days = 30): Promise<BiggestJumpResult | null> {
  const now = new Date();
  const currentStart = new Date(now);
  currentStart.setDate(now.getDate() - days);
  const previousStart = new Date(currentStart);
  previousStart.setDate(currentStart.getDate() - days);

  const sessions = await prisma.workoutSession.findMany({
    where: { userId, date: { gte: previousStart } },
    include: {
      sets: {
        include: { exercise: { select: { id: true, name: true, muscleGroup: true, isBodyweight: true } } },
      },
    },
  });

  // Group max weight per exercise per period
  const exerciseData: Record<string, {
    name: string;
    isAssisted: boolean;
    currentBests: number[];
    previousBests: number[];
  }> = {};

  for (const session of sessions) {
    const isCurrent = session.date >= currentStart;

    // Deduplicate sets
    const byExercise: Record<string, Record<number, typeof session.sets[0]>> = {};
    const sorted = [...session.sets].sort(
      (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
    );
    for (const set of sorted) {
      if (!byExercise[set.exerciseId]) byExercise[set.exerciseId] = {};
      if (!byExercise[set.exerciseId][set.setNumber]) {
        byExercise[set.exerciseId][set.setNumber] = set;
      }
    }

    for (const [exId, exSets] of Object.entries(byExercise)) {
      const firstSet = Object.values(exSets)[0];
      if (!firstSet) continue;
      const ex = firstSet.exercise;

      // Skip bodyweight and cardio
      if (ex.isBodyweight || ex.muscleGroup === MuscleGroup.CARDIO) continue;

      if (!exerciseData[exId]) {
        exerciseData[exId] = {
          name: ex.name,
          isAssisted: isAssistedExercise(ex.name),
          currentBests: [],
          previousBests: [],
        };
      }

      let sessionMax = 0;
      for (const set of Object.values(exSets)) {
        const w = set.weightKg ? Number(set.weightKg) : 0;
        if (w > 0) sessionMax = Math.max(sessionMax, w);
      }

      if (sessionMax > 0) {
        if (isCurrent) exerciseData[exId].currentBests.push(sessionMax);
        else exerciseData[exId].previousBests.push(sessionMax);
      }
    }
  }

  // Find biggest jump
  let best: BiggestJumpResult | null = null;
  let bestJump = 0;

  for (const [exId, data] of Object.entries(exerciseData)) {
    // Need at least 2 data points in each period
    if (data.currentBests.length < 2 || data.previousBests.length < 2) continue;

    const currentBest = data.isAssisted
      ? Math.min(...data.currentBests)
      : Math.max(...data.currentBests);
    const previousBest = data.isAssisted
      ? Math.min(...data.previousBests)
      : Math.max(...data.previousBests);

    const jump = data.isAssisted
      ? previousBest - currentBest  // Lower is better for assisted
      : currentBest - previousBest;

    if (jump > 0 && jump > bestJump) {
      bestJump = jump;
      const pct = previousBest > 0 ? (jump / previousBest) * 100 : 0;
      best = {
        exerciseId: exId,
        exerciseName: data.name,
        previousBest,
        currentBest,
        absoluteJump: Math.round(jump * 10) / 10,
        percentJump: Math.round(pct),
        isAssisted: data.isAssisted,
      };
    }
  }

  return best;
}

// ─── Training Balance (30 days) ───────────────────────────────────────────────

export async function getTrainingBalance(userId: string, days = 30): Promise<TrainingBalance> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const sessions = await prisma.workoutSession.findMany({
    where: { userId, date: { gte: since } },
    include: {
      sets: {
        include: { exercise: { select: { muscleGroup: true } } },
      },
    },
  });

  let upper = 0, lower = 0, bw = 0;

  for (const session of sessions) {
    // Deduplicate
    const latestByKey: Record<string, typeof session.sets[0]> = {};
    const sorted = [...session.sets].sort(
      (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
    );
    for (const set of sorted) {
      const key = `${set.exerciseId}:${set.setNumber}`;
      if (!latestByKey[key]) latestByKey[key] = set;
    }

    for (const set of Object.values(latestByKey)) {
      const mg = set.exercise.muscleGroup;
      if (mg === MuscleGroup.UPPER_BODY) upper++;
      else if (mg === MuscleGroup.LOWER_BODY) lower++;
      else if (mg === MuscleGroup.BODYWEIGHT) bw++;
      // Skip CARDIO for balance
    }
  }

  const total = upper + lower + bw;
  const pct = (v: number) => (total > 0 ? Math.round((v / total) * 100) : 0);

  return {
    upperBody: { sets: upper, pct: pct(upper) },
    lowerBody: { sets: lower, pct: pct(lower) },
    bodyweight: { sets: bw, pct: pct(bw) },
    total,
  };
}

// ─── Cumulative Volume ────────────────────────────────────────────────────────

export async function getCumulativeVolume(userId: string): Promise<number> {
  const result = await prisma.$queryRaw<[{ total: bigint | null }]>`
    SELECT SUM(es."weightKg" * es."reps") as total
    FROM "ExerciseSet" es
    JOIN "WorkoutSession" ws ON ws.id = es."sessionId"
    WHERE ws."userId" = ${userId}
      AND es."weightKg" IS NOT NULL
      AND es."weightKg" > 0
  `;
  return Number(result[0]?.total ?? 0);
}

// ─── Total Workout Count ──────────────────────────────────────────────────────

export async function getTotalWorkoutCount(userId: string): Promise<number> {
  return prisma.workoutSession.count({ where: { userId } });
}

// ─── Recent PRs ───────────────────────────────────────────────────────────────

export function getRecentPRs(prs: PRRecord[], limit = 3): PRRecord[] {
  return [...prs]
    .sort((a, b) => b.achievedOn.localeCompare(a.achievedOn))
    .slice(0, limit);
}

// ─── Badge Calculation ────────────────────────────────────────────────────────

interface BadgeInputs {
  bestStreak: number;
  plannedLast30: number;
  completedLast30: number;
  thisWeekWorkouts: string[];
  prs: PRRecord[];
  cumulativeVolume: number;
  totalWorkouts: number;
  // For special badges
  recentWorkoutDates: string[]; // last 60 days
  last30DaysWorkouts: string[];
}

export function computeBadges(inputs: BadgeInputs): UserBadge[] {
  const {
    bestStreak,
    plannedLast30,
    completedLast30,
    thisWeekWorkouts,
    prs,
    cumulativeVolume,
    totalWorkouts,
    recentWorkoutDates,
    last30DaysWorkouts,
  } = inputs;

  const maxWeight = Math.max(0, ...prs.filter(p => p.maxWeightKg != null && !p.isAssisted).map(p => Number(p.maxWeightKg)));
  const consistency30 = plannedLast30 > 0 ? (completedLast30 / plannedLast30) * 100 : 0;

  // Check if all 3 muscle groups trained this week
  const weekMuscleGroups = new Set<string>();
  // We need to determine muscle groups from workouts — approximate from last30Days dates matching this week
  // Actually we have thisWeekWorkouts which is just dates. We need more info.
  // For allrounder, we'll check from the PR list muscle groups (rough proxy)
  // Better: check from last30DaysWorkouts — but we don't have muscle groups here.
  // We'll skip the perfect allrounder check and use a simpler heuristic.

  // Check for comeback: gap of 14+ days in recent workout dates
  let hasComeback = false;
  if (recentWorkoutDates.length >= 2) {
    const sorted = [...recentWorkoutDates].sort();
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1] + "T12:00:00");
      const curr = new Date(sorted[i] + "T12:00:00");
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays >= 14) {
        hasComeback = true;
        break;
      }
    }
  }

  // Check week_warrior: 4+ workouts this week AND last week
  const thisWeekCount = thisWeekWorkouts.length;
  // For last week, count from last30DaysWorkouts
  const now = new Date();
  const thisMon = getMonday(now);
  const lastMon = new Date(thisMon);
  lastMon.setDate(lastMon.getDate() - 7);
  const lastMonISO = toISO(lastMon);
  const thisMonISO = toISO(thisMon);
  const lastWeekWorkouts = last30DaysWorkouts.filter(d => d >= lastMonISO && d < thisMonISO);
  const isWeekWarrior = thisWeekCount >= 4 && lastWeekWorkouts.length >= 4;

  const checks: Record<string, { unlocked: boolean; progress?: number; progressLabel?: string }> = {
    // Streak badges
    streak_10: { unlocked: bestStreak >= 10, progress: Math.min(1, bestStreak / 10), progressLabel: `${Math.min(bestStreak, 10)} / 10` },
    streak_30: { unlocked: bestStreak >= 30, progress: Math.min(1, bestStreak / 30), progressLabel: `${Math.min(bestStreak, 30)} / 30` },
    streak_50: { unlocked: bestStreak >= 50, progress: Math.min(1, bestStreak / 50), progressLabel: `${Math.min(bestStreak, 50)} / 50` },
    streak_75: { unlocked: bestStreak >= 75, progress: Math.min(1, bestStreak / 75), progressLabel: `${Math.min(bestStreak, 75)} / 75` },
    streak_100: { unlocked: bestStreak >= 100, progress: Math.min(1, bestStreak / 100), progressLabel: `${Math.min(bestStreak, 100)} / 100` },

    // Consistency
    first_steps: { unlocked: thisWeekCount >= 3, progress: Math.min(1, thisWeekCount / 3), progressLabel: `${Math.min(thisWeekCount, 3)} / 3` },
    week_warrior: { unlocked: isWeekWarrior },
    month_machine: { unlocked: consistency30 >= 90, progress: Math.min(1, consistency30 / 90), progressLabel: `${Math.round(consistency30)}%` },

    // Strength
    first_20kg: { unlocked: maxWeight >= 20, progress: Math.min(1, maxWeight / 20), progressLabel: `${Math.round(maxWeight)} / 20 kg` },
    half_zentner: { unlocked: maxWeight >= 50, progress: Math.min(1, maxWeight / 50), progressLabel: `${Math.round(maxWeight)} / 50 kg` },
    zentner: { unlocked: maxWeight >= 100, progress: Math.min(1, maxWeight / 100), progressLabel: `${Math.round(maxWeight)} / 100 kg` },

    // Volume
    vol_1t: { unlocked: cumulativeVolume >= 1000, progress: Math.min(1, cumulativeVolume / 1000), progressLabel: `${Math.round(cumulativeVolume)} / 1.000 kg` },
    vol_10t: { unlocked: cumulativeVolume >= 10000, progress: Math.min(1, cumulativeVolume / 10000), progressLabel: `${Math.round(cumulativeVolume / 1000)}t / 10t` },
    vol_100t: { unlocked: cumulativeVolume >= 100000, progress: Math.min(1, cumulativeVolume / 100000), progressLabel: `${Math.round(cumulativeVolume / 1000)}t / 100t` },

    // Special
    club_100: { unlocked: totalWorkouts >= 100, progress: Math.min(1, totalWorkouts / 100), progressLabel: `${Math.min(totalWorkouts, 100)} / 100` },
    comeback: { unlocked: hasComeback },
    allrounder: { unlocked: false }, // Will be computed with real data on the page
  };

  return BADGE_CATALOG.map((def) => {
    const check = checks[def.key] ?? { unlocked: false };
    return {
      ...def,
      unlocked: check.unlocked,
      progress: check.progress,
      progressLabel: check.progressLabel,
    };
  });
}

// ─── Allrounder check (needs separate data) ──────────────────────────────────

export async function hasAllrounderThisWeek(userId: string): Promise<boolean> {
  const now = new Date();
  const thisMon = getMonday(now);
  const nextMon = new Date(thisMon);
  nextMon.setDate(nextMon.getDate() + 7);

  const muscleGroups = await prisma.exerciseSet.findMany({
    where: {
      session: { userId, date: { gte: thisMon, lt: nextMon } },
    },
    select: { exercise: { select: { muscleGroup: true } } },
    distinct: ["exerciseId"],
  });

  const groups = new Set(muscleGroups.map(s => s.exercise.muscleGroup));
  return groups.has(MuscleGroup.UPPER_BODY) && groups.has(MuscleGroup.LOWER_BODY) && groups.has(MuscleGroup.BODYWEIGHT);
}
