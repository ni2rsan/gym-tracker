import { prisma } from "@/lib/prisma";
import { computeSetDiffs, computeOutcome } from "@/lib/workoutDiff";
export { TREE_COUNT, TREE_CAPACITY, STAGE_THRESHOLDS, getGardenState } from "@/lib/gardenUtils";
export type { TreeState } from "@/lib/gardenUtils";

// ─── Stardust persistence ────────────────────────────────────────────────────

/**
 * Returns the user's current stardust total.
 * On first call (stardustSynced = false), computes the full historical tally and persists it.
 */
export async function getOrSyncStardust(userId: string): Promise<number> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { stardustTotal: true, stardustSynced: true },
  });

  if (!user.stardustSynced) {
    const total = await computeStardustFromHistory(userId);
    await prisma.user.update({
      where: { id: userId },
      data: { stardustTotal: total, stardustSynced: true },
    });
    return total;
  }

  return user.stardustTotal;
}

/** Increments the user's stardust total and returns the new value. */
export async function awardStardust(userId: string, count: number): Promise<number> {
  if (count <= 0) {
    const u = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { stardustTotal: true },
    });
    return u.stardustTotal;
  }
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { stardustTotal: { increment: count } },
    select: { stardustTotal: true },
  });
  return updated.stardustTotal;
}

// ─── Historical computation ──────────────────────────────────────────────────

/**
 * Scans ALL historical workout sessions for the user and counts every
 * exercise instance that showed an "all-positive" outcome vs. the previous
 * session for that exercise.  Each such instance = 1 stardust.
 */
async function computeStardustFromHistory(userId: string): Promise<number> {
  // Pre-load exercise muscle groups to know which are bodyweight
  const exercises = await prisma.exercise.findMany({
    select: { id: true, muscleGroup: true },
  });
  const isBodyweightById = new Map(
    exercises.map((e) => [e.id, e.muscleGroup === "BODYWEIGHT"])
  );

  // All sessions ordered oldest → newest
  const sessions = await prisma.workoutSession.findMany({
    where: { userId },
    orderBy: { date: "asc" },
    select: {
      sets: {
        orderBy: [{ setNumber: "asc" }, { recordedAt: "desc" }],
        select: { exerciseId: true, setNumber: true, reps: true, weightKg: true, recordedAt: true },
      },
    },
  });

  // prevSetsMap[exerciseId] = deduped sets from the most-recent previous session
  const prevSetsMap: Record<string, { setNumber: number; reps: number; weightKg: number | null }[]> = {};
  let total = 0;

  for (const session of sessions) {
    // Group sets by exercise, keep latest recordedAt per setNumber
    const byExercise: Record<string, Map<number, { reps: number; weightKg: number | null; recordedAt: Date }>> = {};
    for (const set of session.sets) {
      if (!byExercise[set.exerciseId]) byExercise[set.exerciseId] = new Map();
      const existing = byExercise[set.exerciseId].get(set.setNumber);
      if (!existing || set.recordedAt > existing.recordedAt) {
        byExercise[set.exerciseId].set(set.setNumber, {
          reps: set.reps,
          weightKg: set.weightKg !== null ? Number(set.weightKg) : null,
          recordedAt: set.recordedAt,
        });
      }
    }

    for (const [exerciseId, setsMap] of Object.entries(byExercise)) {
      const currentSets = Array.from(setsMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([setNumber, { reps, weightKg }]) => ({ setNumber, reps, weightKg }));

      const prevSets = prevSetsMap[exerciseId];
      if (prevSets && prevSets.length > 0) {
        const isBodyweight = isBodyweightById.get(exerciseId) ?? false;
        const diffs = computeSetDiffs(prevSets, currentSets);
        const { allPositive } = computeOutcome(diffs, isBodyweight);
        if (allPositive) total++;
      }

      prevSetsMap[exerciseId] = currentSets;
    }
  }

  return total;
}
