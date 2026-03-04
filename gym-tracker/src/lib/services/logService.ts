import { prisma } from "@/lib/prisma";
import { MuscleGroup } from "@/generated/prisma/client";

export type WorkoutLogEntry = {
  type: "workout";
  id: string;
  timestamp: Date;
  workoutDate: string; // ISO YYYY-MM-DD
  exercises: {
    exerciseId: string;
    name: string;
    isBodyweight: boolean;
    isCardio: boolean;
    sets: { setNumber: number; reps: number; weightKg: number | null }[];
  }[];
};

export type MetricLogEntry = {
  type: "metric";
  id: string;
  timestamp: Date;
  weightKg: number | null;
  bodyFatPct: number | null;
  notes: string | null;
};

export type LogEntry = WorkoutLogEntry | MetricLogEntry;

export async function getActivityLog(userId: string): Promise<LogEntry[]> {
  const [sessions, metrics] = await Promise.all([
    prisma.workoutSession.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 60,
      include: {
        sets: {
          orderBy: { recordedAt: "desc" },
          include: {
            exercise: { select: { id: true, name: true, isBodyweight: true, muscleGroup: true } },
          },
        },
      },
    }),
    prisma.bodyMetricEntry.findMany({
      where: { userId },
      orderBy: { recordedAt: "desc" },
      take: 100,
      select: {
        id: true,
        weightKg: true,
        bodyFatPct: true,
        recordedAt: true,
        notes: true,
      },
    }),
  ]);

  // Process workout sessions — deduplicate sets (latest per exercise+setNumber)
  const workoutLogs: WorkoutLogEntry[] = sessions
    .map((session) => {
      const latestByKey: Record<string, (typeof session.sets)[0]> = {};
      for (const set of session.sets) {
        const key = `${set.exerciseId}:${set.setNumber}`;
        if (!latestByKey[key]) latestByKey[key] = set; // already ordered desc
      }

      const exerciseMap: Record<string, WorkoutLogEntry["exercises"][0]> = {};
      for (const set of Object.values(latestByKey)) {
        if (!exerciseMap[set.exerciseId]) {
          exerciseMap[set.exerciseId] = {
            exerciseId: set.exerciseId,
            name: set.exercise.name,
            isBodyweight: set.exercise.isBodyweight,
            isCardio: set.exercise.muscleGroup === MuscleGroup.CARDIO,
            sets: [],
          };
        }
        exerciseMap[set.exerciseId].sets.push({
          setNumber: set.setNumber,
          reps: set.reps,
          weightKg: set.weightKg ? Number(set.weightKg) : null,
        });
      }

      const exercises = Object.values(exerciseMap).map((ex) => ({
        ...ex,
        sets: ex.sets.sort((a, b) => a.setNumber - b.setNumber),
      }));

      // Skip sessions with no recorded sets
      if (exercises.length === 0) return null;

      // Timestamp = latest set save, fallback to session creation
      const timestamp =
        session.sets.length > 0 ? session.sets[0].recordedAt : session.createdAt;

      return {
        type: "workout" as const,
        id: session.id,
        timestamp,
        workoutDate: session.date.toISOString().split("T")[0],
        exercises,
      };
    })
    .filter((e): e is WorkoutLogEntry => e !== null);

  const metricLogs: MetricLogEntry[] = metrics.map((m) => ({
    type: "metric" as const,
    id: m.id,
    timestamp: m.recordedAt,
    weightKg: m.weightKg ? Number(m.weightKg) : null,
    bodyFatPct: m.bodyFatPct ? Number(m.bodyFatPct) : null,
    notes: m.notes,
  }));

  return [...workoutLogs, ...metricLogs].sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
  );
}
