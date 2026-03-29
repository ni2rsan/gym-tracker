export function isAssistedExercise(name: string): boolean {
  return name.toUpperCase().startsWith("ASSISTED");
}

export type PrevSet = { setNumber: number; reps: number; weightKg: number | null };
export type CurrSet = { setNumber: number; reps: number | string; weightKg: number | string | null };

export type SetDiff = {
  setNumber: number;
  prevReps: number | null;
  prevKg: number | null;
  currReps: number | null;
  currKg: number | null;
  diffReps: number | null;
  diffKg: number | null;
  isNewSet: boolean;   // curr exists, prev doesn't
  isDropped: boolean;  // prev exists, curr doesn't
};

export function computeSetDiffs(prevSets: PrevSet[], currentSets: CurrSet[]): SetDiff[] {
  const prevByNum = new Map<number, PrevSet>();
  for (const s of prevSets) prevByNum.set(s.setNumber, s);

  const currByNum = new Map<number, CurrSet>();
  for (const s of currentSets) currByNum.set(s.setNumber, s);

  const allSetNumbers = new Set([...prevByNum.keys(), ...currByNum.keys()]);
  const diffs: SetDiff[] = [];

  for (const setNumber of [...allSetNumbers].sort((a, b) => a - b)) {
    const prev = prevByNum.get(setNumber) ?? null;
    const curr = currByNum.get(setNumber) ?? null;

    const prevReps = prev?.reps ?? null;
    const prevKg = prev?.weightKg ?? null;

    const currRepsRaw = curr?.reps ?? null;
    const currReps = currRepsRaw !== null && currRepsRaw !== "" ? Number(currRepsRaw) : null;
    const currKgRaw = curr?.weightKg ?? null;
    const currKg = currKgRaw !== null && currKgRaw !== "" ? Number(currKgRaw) : null;

    const diffReps =
      prevReps !== null && currReps !== null ? currReps - prevReps : null;
    const diffKg =
      prevKg !== null && currKg !== null ? currKg - prevKg : null;

    diffs.push({
      setNumber,
      prevReps,
      prevKg,
      currReps: isNaN(currReps as number) ? null : currReps,
      currKg: isNaN(currKg as number) ? null : currKg,
      diffReps,
      diffKg,
      isNewSet: prev === null && curr !== null,
      isDropped: prev !== null && curr === null,
    });
  }

  return diffs;
}

export function computeOutcome(
  diffs: SetDiff[],
  isBodyweight: boolean
): { allPositive: boolean; allNegative: boolean } {
  // Only consider aligned pairs (not new/dropped sets)
  const aligned = diffs.filter((d) => !d.isNewSet && !d.isDropped);

  if (aligned.length === 0) {
    return { allPositive: false, allNegative: false };
  }

  if (isBodyweight) {
    // Only reps matter for bodyweight
    const hasPositive = aligned.some((d) => d.diffReps !== null && d.diffReps > 0);
    const hasNegative = aligned.some((d) => d.diffReps !== null && d.diffReps < 0);
    const allNonNegative = aligned.every((d) => d.diffReps === null || d.diffReps >= 0);
    const allNonPositive = aligned.every((d) => d.diffReps === null || d.diffReps <= 0);
    return {
      allPositive: allNonNegative && hasPositive,
      allNegative: allNonPositive && hasNegative,
    };
  }

  // Weighted: both reps and kg
  const hasAnyPositive = aligned.some(
    (d) => (d.diffReps !== null && d.diffReps > 0) || (d.diffKg !== null && d.diffKg > 0)
  );
  const hasAnyNegative = aligned.some(
    (d) => (d.diffReps !== null && d.diffReps < 0) || (d.diffKg !== null && d.diffKg < 0)
  );
  const allNonNegative = aligned.every(
    (d) =>
      (d.diffReps === null || d.diffReps >= 0) &&
      (d.diffKg === null || d.diffKg >= 0)
  );
  const allNonPositive = aligned.every(
    (d) =>
      (d.diffReps === null || d.diffReps <= 0) &&
      (d.diffKg === null || d.diffKg <= 0)
  );

  return {
    allPositive: allNonNegative && hasAnyPositive,
    allNegative: allNonPositive && hasAnyNegative,
  };
}
