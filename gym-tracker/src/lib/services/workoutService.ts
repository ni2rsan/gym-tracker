// APPEND-ONLY: No update or delete operations are permitted on ExerciseSet rows.
import { prisma } from "@/lib/prisma";
import type { ExerciseInput } from "@/types";

export async function saveWorkoutSession(
  userId: string,
  date: string,
  exercises: ExerciseInput[]
) {
  // Find or create the session for this user + date
  let session = await prisma.workoutSession.findFirst({
    where: { userId, date: new Date(date + "T12:00:00") },
  });

  if (!session) {
    session = await prisma.workoutSession.create({
      data: { userId, date: new Date(date + "T12:00:00") },
    });
  }

  // APPEND-ONLY: always INSERT new ExerciseSet rows, never update existing ones
  const setsToCreate = [];
  for (const exercise of exercises) {
    for (const set of exercise.sets) {
      const reps = Number(set.reps);
      const weightKg = set.weightKg !== "" && set.weightKg != null
        ? Number(set.weightKg)
        : null;

      // Skip completely empty sets
      if (reps === 0 && (weightKg === null || weightKg === 0)) continue;

      setsToCreate.push({
        sessionId: session.id,
        exerciseId: exercise.exerciseId,
        setNumber: set.setNumber,
        reps,
        weightKg,
      });
    }
  }

  if (setsToCreate.length > 0) {
    await prisma.exerciseSet.createMany({ data: setsToCreate });
  }

  return session;
}

export async function getLatestSetsForDate(userId: string, date: string) {
  const session = await prisma.workoutSession.findFirst({
    where: { userId, date: new Date(date + "T12:00:00") },
  });

  if (!session) return {};

  // Get the latest recorded sets per exercise (most recent recordedAt per set)
  const allSets = await prisma.exerciseSet.findMany({
    where: { sessionId: session.id },
    orderBy: { recordedAt: "desc" },
  });

  // Group by exerciseId, then by setNumber, keep only the latest per setNumber
  const latestSets: Record<string, Record<number, typeof allSets[0]>> = {};
  for (const set of allSets) {
    if (!latestSets[set.exerciseId]) {
      latestSets[set.exerciseId] = {};
    }
    if (!latestSets[set.exerciseId][set.setNumber]) {
      latestSets[set.exerciseId][set.setNumber] = set;
    }
  }

  // Flatten to exercise → sets[]
  const result: Record<string, Array<{ setNumber: number; reps: number; weightKg: number | null }>> = {};
  for (const [exerciseId, sets] of Object.entries(latestSets)) {
    result[exerciseId] = Object.values(sets)
      .sort((a, b) => a.setNumber - b.setNumber)
      .map((s) => ({
        setNumber: s.setNumber,
        reps: s.reps,
        weightKg: s.weightKg ? Number(s.weightKg) : null,
      }));
  }

  return result;
}

/** Returns the most recent logged sets per exercise across the last 10 sessions.
 *  Used to pre-fill the workout form when no data exists for the selected date. */
export async function getLatestSetsPerExercise(userId: string) {
  const sessions = await prisma.workoutSession.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: 10,
    include: { sets: { orderBy: { recordedAt: "desc" } } },
  });

  const result: Record<string, Array<{ setNumber: number; reps: number; weightKg: number | null }>> = {};

  for (const session of sessions) {
    const setsByExercise: Record<string, typeof session.sets> = {};
    for (const set of session.sets) {
      if (!setsByExercise[set.exerciseId]) setsByExercise[set.exerciseId] = [];
      setsByExercise[set.exerciseId].push(set);
    }
    for (const [exerciseId, sets] of Object.entries(setsByExercise)) {
      if (result[exerciseId]) continue; // already found a more recent session
      const deduped: Record<number, typeof sets[0]> = {};
      for (const set of sets) {
        if (!deduped[set.setNumber]) deduped[set.setNumber] = set;
      }
      result[exerciseId] = Object.values(deduped)
        .sort((a, b) => a.setNumber - b.setNumber)
        .map((s) => ({
          setNumber: s.setNumber,
          reps: s.reps,
          weightKg: s.weightKg ? Number(s.weightKg) : null,
        }));
    }
  }
  return result;
}

export async function deleteExerciseSetsForDate(userId: string, exerciseId: string, date: string): Promise<void> {
  const session = await prisma.workoutSession.findFirst({
    where: { userId, date: new Date(date + "T12:00:00") },
  });
  if (!session) return;
  await prisma.exerciseSet.deleteMany({
    where: { sessionId: session.id, exerciseId },
  });
}

export async function deleteWorkoutSessionByDate(userId: string, date: string): Promise<void> {
  await prisma.workoutSession.deleteMany({
    where: { userId, date: new Date(date + "T12:00:00") },
  });
}

export async function changeWorkoutSessionDate(userId: string, sessionId: string, newDate: string): Promise<void> {
  await prisma.workoutSession.updateMany({
    where: { id: sessionId, userId },
    data: { date: new Date(newDate + "T12:00:00") },
  });
}

export type WorkoutExerciseSummary = {
  name: string;
  muscleGroup: string;
  isCardio: boolean;
  isBodyweight: boolean;
  maxKg: number | null;
  minutes: number | null;
};

export async function getWorkoutSummaryForDate(userId: string, date: string): Promise<WorkoutExerciseSummary[]> {
  const session = await prisma.workoutSession.findFirst({
    where: { userId, date: new Date(date + "T12:00:00") },
    include: {
      sets: {
        orderBy: { recordedAt: "desc" },
        include: { exercise: { select: { id: true, name: true, isBodyweight: true, muscleGroup: true } } },
      },
    },
  });
  if (!session) return [];

  const latestByKey: Record<string, (typeof session.sets)[0]> = {};
  for (const set of session.sets) {
    const key = `${set.exerciseId}:${set.setNumber}`;
    if (!latestByKey[key]) latestByKey[key] = set;
  }

  const exerciseMap: Record<string, WorkoutExerciseSummary> = {};
  for (const set of Object.values(latestByKey)) {
    const isCardio = (set.exercise.muscleGroup as string) === "CARDIO";
    if (!exerciseMap[set.exerciseId]) {
      exerciseMap[set.exerciseId] = {
        name: set.exercise.name,
        muscleGroup: set.exercise.muscleGroup as string,
        isCardio,
        isBodyweight: set.exercise.isBodyweight,
        maxKg: null,
        minutes: isCardio ? set.reps : null,
      };
    }
    if (!isCardio && !set.exercise.isBodyweight && set.weightKg !== null) {
      const kg = Number(set.weightKg);
      const cur = exerciseMap[set.exerciseId].maxKg;
      if (cur === null || kg > cur) exerciseMap[set.exerciseId].maxKg = kg;
    }
  }

  return Object.values(exerciseMap);
}

export type WorkoutDayData = {
  date: string;
  exercises: Array<{
    exerciseId: string;
    name: string;
    muscleGroup: string;
    isBodyweight: boolean;
    isCardio: boolean;
    sets: Array<{ setNumber: number; reps: number; weightKg: number | null }>;
  }>;
};

export async function getWorkoutsForDateRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<WorkoutDayData[]> {
  const sessions = await prisma.workoutSession.findMany({
    where: {
      userId,
      date: {
        gte: new Date(startDate + "T00:00:00"),
        lte: new Date(endDate + "T23:59:59"),
      },
    },
    orderBy: { date: "asc" },
    include: {
      sets: {
        orderBy: { recordedAt: "desc" },
        include: {
          exercise: {
            select: { id: true, name: true, isBodyweight: true, muscleGroup: true },
          },
        },
      },
    },
  });

  return sessions.map((session) => {
    const latestByKey: Record<string, typeof session.sets[0]> = {};
    for (const set of session.sets) {
      const key = `${set.exerciseId}:${set.setNumber}`;
      if (!latestByKey[key]) latestByKey[key] = set;
    }

    const exerciseMap: Record<string, WorkoutDayData["exercises"][0]> = {};
    for (const set of Object.values(latestByKey)) {
      const isCardio = (set.exercise.muscleGroup as string) === "CARDIO";
      if (!exerciseMap[set.exerciseId]) {
        exerciseMap[set.exerciseId] = {
          exerciseId: set.exerciseId,
          name: set.exercise.name,
          muscleGroup: set.exercise.muscleGroup as string,
          isBodyweight: set.exercise.isBodyweight,
          isCardio,
          sets: [],
        };
      }
      exerciseMap[set.exerciseId].sets.push({
        setNumber: set.setNumber,
        reps: set.reps,
        weightKg: set.weightKg !== null ? Number(set.weightKg) : null,
      });
    }

    for (const ex of Object.values(exerciseMap)) {
      ex.sets.sort((a, b) => a.setNumber - b.setNumber);
    }

    return {
      date: session.date.toISOString().split("T")[0],
      exercises: Object.values(exerciseMap),
    };
  });
}

export async function getRecentWorkoutDates(userId: string, limit = 30): Promise<string[]> {
  const sessions = await prisma.workoutSession.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: limit,
    select: { date: true },
  });
  return sessions.map((s) => s.date.toISOString().split("T")[0]);
}
