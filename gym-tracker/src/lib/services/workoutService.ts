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
    where: { userId, date: new Date(date) },
  });

  if (!session) {
    session = await prisma.workoutSession.create({
      data: { userId, date: new Date(date) },
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
    where: { userId, date: new Date(date) },
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

export async function getRecentWorkoutDates(userId: string, limit = 30): Promise<string[]> {
  const sessions = await prisma.workoutSession.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: limit,
    select: { date: true },
  });
  return sessions.map((s) => s.date.toISOString().split("T")[0]);
}
