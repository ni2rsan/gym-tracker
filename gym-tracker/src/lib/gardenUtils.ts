// Client-safe garden constants and utilities — NO server/Prisma imports.

export const TREE_COUNT = 6;
export const TREE_CAPACITY = 100;

/** Minimum stardust within a tree to reach each stage (index = stage - 1) */
export const STAGE_THRESHOLDS = [0, 10, 25, 50, 75] as const;

export type TreeState = {
  treeIndex: number;
  stardust: number;
  stage: 1 | 2 | 3 | 4 | 5;
  isUnlocked: boolean;
  isComplete: boolean;
};

export function getGardenState(stardustTotal: number): TreeState[] {
  return Array.from({ length: TREE_COUNT }, (_, i) => {
    const stardust = Math.max(0, Math.min(stardustTotal - i * TREE_CAPACITY, TREE_CAPACITY));
    const isUnlocked = i === 0 || stardustTotal >= i * TREE_CAPACITY;

    let stage: 1 | 2 | 3 | 4 | 5 = 1;
    for (let s = 0; s < STAGE_THRESHOLDS.length; s++) {
      if (stardust >= STAGE_THRESHOLDS[s]) stage = (s + 1) as 1 | 2 | 3 | 4 | 5;
    }

    return { treeIndex: i, stardust, stage, isUnlocked, isComplete: stardust >= TREE_CAPACITY };
  });
}
