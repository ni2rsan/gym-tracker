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

// ─── Exercise Stat Cards ────────────────────────────────────────────────────

export type ExerciseStatCard = {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string;
  isBodyweight: boolean;
  isAssisted: boolean;
  // Latest session
  latestWeightKg: number | null;
  latestReps: number | null;
  latestDate: string | null;
  // Delta vs previous session (null = no prior session or no change)
  deltaWeightKg: number | null;
  deltaReps: number | null;
  // All-time PR
  prWeightKg: number | null;
  prReps: number | null;
  prDate: string | null;
  isPR: boolean; // latest session date === prDate
  // Totals
  totalSets: number;
  totalWorkouts: number;
  // Chronological history for mini chart (ascending, capped at 30 sessions)
  history: {
    date: string;
    weightKg: number | null;
    reps: number | null;
    sets: { setNumber: number; reps: number; weightKg: number | null }[];
  }[];
};

type RawSet = {
  setNumber: number;
  reps: number;
  weightKg: number | null;
  recordedAt: Date;
};

function sessionMax(
  sets: RawSet[],
  isAssisted: boolean
): { maxWeight: number | null; maxReps: number } {
  const deduped = new Map<number, RawSet>();
  for (const s of [...sets].sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime())) {
    if (!deduped.has(s.setNumber)) deduped.set(s.setNumber, s);
  }
  let maxWeight: number | null = null;
  let maxReps = 0;
  for (const s of deduped.values()) {
    if (s.weightKg !== null) {
      maxWeight =
        maxWeight === null
          ? s.weightKg
          : isAssisted
            ? Math.min(maxWeight, s.weightKg)
            : Math.max(maxWeight, s.weightKg);
    }
    maxReps = Math.max(maxReps, s.reps);
  }
  return { maxWeight, maxReps };
}

export async function getExerciseStatCards(userId: string): Promise<ExerciseStatCard[]> {
  const sessions = await prisma.workoutSession.findMany({
    where: { userId },
    select: {
      date: true,
      sets: {
        where: { exercise: { muscleGroup: { not: MuscleGroup.CARDIO } } },
        select: {
          setNumber: true,
          reps: true,
          weightKg: true,
          recordedAt: true,
          exerciseId: true,
          exercise: {
            select: { id: true, name: true, isBodyweight: true, muscleGroup: true },
          },
        },
      },
    },
    orderBy: { date: "desc" },
  });

  type ExerciseEntry = {
    info: { id: string; name: string; isBodyweight: boolean; muscleGroup: string };
    sessionDates: string[];
    byDate: Map<string, RawSet[]>;
  };

  const exMap = new Map<string, ExerciseEntry>();

  for (const session of sessions) {
    const dateStr = session.date.toISOString().split("T")[0];
    for (const set of session.sets) {
      let entry = exMap.get(set.exerciseId);
      if (!entry) {
        entry = { info: set.exercise, sessionDates: [], byDate: new Map() };
        exMap.set(set.exerciseId, entry);
      }
      if (!entry.byDate.has(dateStr)) {
        entry.byDate.set(dateStr, []);
        entry.sessionDates.push(dateStr); // already desc because sessions ordered desc
      }
      entry.byDate.get(dateStr)!.push({
        setNumber: set.setNumber,
        reps: set.reps,
        weightKg: set.weightKg ? Number(set.weightKg) : null,
        recordedAt: set.recordedAt,
      });
    }
  }

  const cards: ExerciseStatCard[] = [];

  for (const [, ex] of exMap) {
    const assisted = isAssistedExercise(ex.info.name);

    const sessionMaxes = ex.sessionDates.map((date) => ({
      date,
      ...sessionMax(ex.byDate.get(date)!, assisted),
    }));

    const latest = sessionMaxes[0] ?? null;
    const prev = sessionMaxes[1] ?? null;

    // All-time PR
    let prWeightKg: number | null = null;
    let prReps = 0;
    let prDate: string | null = null;
    for (const s of sessionMaxes) {
      const better = ex.info.isBodyweight
        ? s.maxReps > prReps
        : assisted
          ? s.maxWeight !== null && (prWeightKg === null || s.maxWeight < prWeightKg)
          : s.maxWeight !== null && (prWeightKg === null || s.maxWeight > prWeightKg);
      if (better) {
        prWeightKg = s.maxWeight;
        prReps = s.maxReps;
        prDate = s.date;
      }
    }

    // Delta
    let deltaWeightKg: number | null = null;
    let deltaReps: number | null = null;
    if (latest && prev) {
      if (latest.maxWeight !== null && prev.maxWeight !== null) {
        const d = latest.maxWeight - prev.maxWeight;
        if (d !== 0) deltaWeightKg = d;
      }
      const dr = latest.maxReps - prev.maxReps;
      if (dr !== 0) deltaReps = dr;
    }

    // Total sets (deduplicated per session)
    let totalSets = 0;
    for (const [, sets] of ex.byDate) {
      const seen = new Set<number>();
      for (const s of [...sets].sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime())) {
        if (!seen.has(s.setNumber)) { seen.add(s.setNumber); totalSets++; }
      }
    }

    cards.push({
      exerciseId: ex.info.id,
      exerciseName: ex.info.name,
      muscleGroup: ex.info.muscleGroup,
      isBodyweight: ex.info.isBodyweight,
      isAssisted: assisted,
      latestWeightKg: latest?.maxWeight ?? null,
      latestReps: latest?.maxReps ?? null,
      latestDate: latest?.date ?? null,
      deltaWeightKg,
      deltaReps,
      prWeightKg,
      prReps: prReps || null,
      prDate,
      isPR: !!(latest && prDate && latest.date === prDate),
      totalSets,
      totalWorkouts: ex.sessionDates.length,
      // sessionMaxes is desc — reverse for chronological order, cap at 30
      history: [...sessionMaxes].reverse().slice(-30).map((s) => {
        // Deduplicate sets for this session (latest recordedAt per setNumber)
        const rawSets = ex.byDate.get(s.date) ?? [];
        const deduped = new Map<number, RawSet>();
        for (const rs of [...rawSets].sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime())) {
          if (!deduped.has(rs.setNumber)) deduped.set(rs.setNumber, rs);
        }
        const sessionSets = [...deduped.values()]
          .sort((a, b) => a.setNumber - b.setNumber)
          .map((rs) => ({ setNumber: rs.setNumber, reps: rs.reps, weightKg: rs.weightKg }));
        return {
          date: s.date,
          weightKg: s.maxWeight,
          reps: s.maxReps || null,
          sets: sessionSets,
        };
      }),
    });
  }

  cards.sort((a, b) => {
    const groupOrder: Record<string, number> = { UPPER_BODY: 0, LOWER_BODY: 1, BODYWEIGHT: 2 };
    const gd = (groupOrder[a.muscleGroup] ?? 9) - (groupOrder[b.muscleGroup] ?? 9);
    return gd !== 0 ? gd : a.exerciseName.localeCompare(b.exerciseName);
  });

  return cards;
}

// ─── Dashboard Stats ─────────────────────────────────────────────────────────

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
