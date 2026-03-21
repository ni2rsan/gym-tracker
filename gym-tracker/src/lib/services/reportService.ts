import { prisma } from "@/lib/prisma";
import { MuscleGroup } from "@/generated/prisma/client";
import { getRangeStart } from "@/lib/utils";
import type { TimeRange, MetricPoint, ExerciseProgressPoint, PRRecord } from "@/types";

export async function getWeightTrendData(userId: string, range: TimeRange): Promise<MetricPoint[]> {
  const since = getRangeStart(range);

  // Fetch latest-first so first occurrence per day per field = most recent value
  const entries = await prisma.bodyMetricEntry.findMany({
    where: { userId, recordedAt: { gte: since } },
    orderBy: { recordedAt: "desc" },
    select: { weightKg: true, bodyFatPct: true, fatMassKg: true, muscleMassKg: true, recordedAt: true },
  });

  // Each metric is stored in separate rows — deduplicate each independently per day
  const byDayWeight: Record<string, number> = {};
  const byDayBF: Record<string, number> = {};
  const byDayFatMass: Record<string, number> = {};
  const byDayMuscleMass: Record<string, number> = {};
  const allDays = new Set<string>();

  for (const entry of entries) {
    const day = entry.recordedAt.toISOString().split("T")[0];
    allDays.add(day);
    if (entry.weightKg != null && byDayWeight[day] === undefined) {
      byDayWeight[day] = Number(entry.weightKg);
    }
    if (entry.bodyFatPct != null && byDayBF[day] === undefined) {
      byDayBF[day] = Number(entry.bodyFatPct);
    }
    if (entry.fatMassKg != null && byDayFatMass[day] === undefined) {
      byDayFatMass[day] = Number(entry.fatMassKg);
    }
    if (entry.muscleMassKg != null && byDayMuscleMass[day] === undefined) {
      byDayMuscleMass[day] = Number(entry.muscleMassKg);
    }
  }

  return [...allDays]
    .sort()
    .map((day) => ({
      date: day,
      weightKg: byDayWeight[day] ?? null,
      bodyFatPct: byDayBF[day] ?? null,
      fatMassKg: byDayFatMass[day] ?? null,
      muscleMassKg: byDayMuscleMass[day] ?? null,
    }));
}

function isAssistedExercise(name: string): boolean {
  return name.toUpperCase().startsWith("ASSISTED");
}

export async function getExerciseProgressData(
  userId: string,
  exerciseId: string,
  range: TimeRange,
  isAssisted = false
): Promise<ExerciseProgressPoint[]> {
  const since = getRangeStart(range);

  const sessions = await prisma.workoutSession.findMany({
    where: { userId, date: { gte: since } },
    include: {
      sets: {
        where: { exerciseId },
      },
    },
    orderBy: { date: "asc" },
  });

  const byDay: Record<string, { maxWeight: number | null; maxReps: number; totalVolume: number }> = {};

  for (const session of sessions) {
    const day = session.date.toISOString().split("T")[0];
    if (!byDay[day]) {
      byDay[day] = { maxWeight: null, maxReps: 0, totalVolume: 0 };
    }

    // Latest recorded set per setNumber for this session
    const latestBySetNumber: Record<number, typeof session.sets[0]> = {};
    const sorted = [...session.sets].sort(
      (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
    );
    for (const set of sorted) {
      if (!latestBySetNumber[set.setNumber]) {
        latestBySetNumber[set.setNumber] = set;
      }
    }

    for (const set of Object.values(latestBySetNumber)) {
      const weight = set.weightKg ? Number(set.weightKg) : null;
      if (weight !== null) {
        if (isAssisted) {
          byDay[day].maxWeight = byDay[day].maxWeight === null ? weight : Math.min(byDay[day].maxWeight, weight);
        } else {
          byDay[day].maxWeight = Math.max(byDay[day].maxWeight ?? 0, weight);
        }
        byDay[day].totalVolume += weight * set.reps;
      }
      byDay[day].maxReps = Math.max(byDay[day].maxReps, set.reps);
    }
  }

  return Object.entries(byDay).map(([date, data]) => ({
    date,
    maxWeight: data.maxWeight,
    maxReps: data.maxReps || null,
    totalVolume: data.totalVolume || null,
  }));
}

export type ExerciseSeriesData = {
  exerciseId: string;
  name: string;
  isBodyweight: boolean;
  isAssisted: boolean;
  points: ExerciseProgressPoint[];
};

export async function getMultiExerciseProgressData(
  userId: string,
  exerciseIds: string[],
  range: TimeRange
): Promise<ExerciseSeriesData[]> {
  if (exerciseIds.length === 0) return [];

  const exercises = await prisma.exercise.findMany({
    where: { id: { in: exerciseIds } },
    select: { id: true, name: true, isBodyweight: true },
  });

  return Promise.all(
    exercises.map(async (ex) => {
      const assisted = isAssistedExercise(ex.name);
      return {
        exerciseId: ex.id,
        name: ex.name,
        isBodyweight: ex.isBodyweight,
        isAssisted: assisted,
        points: await getExerciseProgressData(userId, ex.id, range, assisted),
      };
    })
  );
}

export async function getPersonalRecords(userId: string): Promise<PRRecord[]> {
  const exercises = await prisma.exercise.findMany({
    where: {
      muscleGroup: { not: MuscleGroup.CARDIO },
      sets: {
        some: { session: { userId } },
      },
    },
    select: { id: true, name: true, isBodyweight: true, muscleGroup: true },
  });

  const prs: PRRecord[] = [];

  for (const exercise of exercises) {
    const assisted = isAssistedExercise(exercise.name);
    const sets = await prisma.exerciseSet.findMany({
      where: {
        exerciseId: exercise.id,
        session: { userId },
      },
      include: { session: { select: { date: true } } },
      orderBy: exercise.isBodyweight
        ? [{ reps: "desc" }, { recordedAt: "desc" }]
        : assisted
          ? [{ weightKg: "asc" }, { reps: "desc" }, { recordedAt: "desc" }]
          : [{ weightKg: "desc" }, { reps: "desc" }, { recordedAt: "desc" }],
      take: 1,
    });

    if (sets.length > 0) {
      const best = sets[0];
      prs.push({
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        muscleGroup: exercise.muscleGroup,
        maxWeightKg: best.weightKg ? Number(best.weightKg) : null,
        repsAtMaxWeight: best.reps,
        maxReps: exercise.isBodyweight ? best.reps : null,
        achievedOn: best.session.date.toISOString().split("T")[0],
        isAssisted: assisted,
      });
    }
  }

  return prs;
}

export async function getDashboardStats(userId: string) {
  const [lastSession, totalSessions, latestMetric] = await Promise.all([
    prisma.workoutSession.findFirst({
      where: { userId },
      orderBy: { date: "desc" },
      select: { date: true },
    }),
    prisma.workoutSession.count({ where: { userId } }),
    prisma.bodyMetricEntry.findFirst({
      where: { userId },
      orderBy: { recordedAt: "desc" },
      select: { weightKg: true, bodyFatPct: true },
    }),
  ]);

  return {
    lastWorkoutDate: lastSession?.date.toISOString().split("T")[0] ?? null,
    totalSessions,
    currentWeightKg: latestMetric?.weightKg ? Number(latestMetric.weightKg) : null,
    currentBodyFatPct: latestMetric?.bodyFatPct ? Number(latestMetric.bodyFatPct) : null,
  };
}
