import { prisma } from "@/lib/prisma";
import { computeSetDiffs, computeOutcome } from "@/lib/workoutDiff";

// ─── Tree / Stage constants ──────────────────────────────────────────────────

export const TREE_COUNT = 6;
export const TREE_CAPACITY = 100; // stardust per tree

/** Minimum stardust within a tree to reach each stage (index = stage - 1) */
export const STAGE_THRESHOLDS = [0, 10, 25, 50, 75] as const;

export type TreeState = {
  treeIndex: number;      // 0-based (0 = tree 1)
  stardust: number;       // 0 – TREE_CAPACITY
  stage: 1 | 2 | 3 | 4 | 5;
  isUnlocked: boolean;
  isComplete: boolean;    // stardust >= TREE_CAPACITY
};

export function getGardenState(stardustTotal: number): TreeState[] {
  return Array.from({ length: TREE_COUNT }, (_, i) => {
    const stardust = Math.max(0, Math.min(stardustTotal - i * TREE_CAPACITY, TREE_CAPACITY));
    const isUnlocked = i === 0 || stardustTotal >= i * TREE_CAPACITY;

    // Walk thresholds to find current stage
    let stage: 1 | 2 | 3 | 4 | 5 = 1;
    for (let s = 0; s < STAGE_THRESHOLDS.length; s++) {
      if (stardust >= STAGE_THRESHOLDS[s]) stage = (s + 1) as 1 | 2 | 3 | 4 | 5;
    }

    return {
      treeIndex: i,
      stardust,
      stage,
      isUnlocked,
      isComplete: stardust >= TREE_CAPACITY,
    };
  });
}

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
