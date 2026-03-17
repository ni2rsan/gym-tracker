import { prisma } from "@/lib/prisma";
import { MuscleGroup } from "@/generated/prisma/client";
import type { ExerciseWithSettings } from "@/types";

export async function getExercisesForUser(userId: string): Promise<ExerciseWithSettings[]> {
  const exercises = await prisma.exercise.findMany({
    where: {
      OR: [
        { isDefault: true },
        { createdByUserId: userId },
        // Exercises created by other users that this user has explicitly adopted
        { userSettings: { some: { userId, isHidden: false } } },
      ],
    },
    include: {
      userSettings: {
        where: { userId },
      },
    },
    orderBy: [{ muscleGroup: "asc" }, { sortOrder: "asc" }],
  });

  const visible = exercises.filter((e) => {
    const setting = e.userSettings[0];
    return !setting?.isHidden;
  });

  // For exercises owned by this user, check if any OTHER user has sets (prevents deletion)
  const ownedIds = visible.filter(e => e.createdByUserId === userId).map(e => e.id);
  const usedByOthers = new Set<string>();
  if (ownedIds.length > 0) {
    const otherSets = await prisma.exerciseSet.findMany({
      where: {
        exerciseId: { in: ownedIds },
        session: { userId: { not: userId } },
      },
      select: { exerciseId: true },
      distinct: ["exerciseId"],
    });
    otherSets.forEach(s => usedByOthers.add(s.exerciseId));
  }

  return visible.map((e) => {
    const setting = e.userSettings[0];
    return {
      id: e.id,
      name: e.name,
      muscleGroup: e.muscleGroup,
      isDefault: e.isDefault,
      isBodyweight: e.isBodyweight,
      isCompound: e.isCompound,
      sortOrder: e.sortOrder,
      isPinned: setting?.isPinned ?? false,
      userSortOrder: setting?.sortOrder ?? e.sortOrder,
      preferredSets: setting?.preferredSets ?? null,
      createdByUserId: e.createdByUserId,
      isOwnedAndDeletable: e.createdByUserId === userId && !usedByOthers.has(e.id),
    };
  });
}

export async function hideExercise(userId: string, exerciseId: string) {
  return prisma.userExerciseSetting.upsert({
    where: { userId_exerciseId: { userId, exerciseId } },
    update: { isHidden: true },
    create: { userId, exerciseId, isHidden: true, isPinned: false, sortOrder: 0 },
  });
}

export async function unhideExercise(userId: string, exerciseId: string) {
  return prisma.userExerciseSetting.upsert({
    where: { userId_exerciseId: { userId, exerciseId } },
    update: { isHidden: false },
    create: { userId, exerciseId, isHidden: false, isPinned: false, sortOrder: 0 },
  });
}

export async function getHiddenExercisesForUser(userId: string) {
  const settings = await prisma.userExerciseSetting.findMany({
    where: { userId, isHidden: true },
    include: { exercise: { select: { id: true, name: true, muscleGroup: true, createdByUserId: true } } },
  });

  const ownedIds = settings
    .filter(s => s.exercise.createdByUserId === userId)
    .map(s => s.exercise.id);
  const usedByOthers = new Set<string>();
  if (ownedIds.length > 0) {
    const otherSets = await prisma.exerciseSet.findMany({
      where: {
        exerciseId: { in: ownedIds },
        session: { userId: { not: userId } },
      },
      select: { exerciseId: true },
      distinct: ["exerciseId"],
    });
    otherSets.forEach(s => usedByOthers.add(s.exerciseId));
  }

  return settings.map((s) => ({
    id: s.exercise.id,
    name: s.exercise.name,
    muscleGroup: s.exercise.muscleGroup as MuscleGroup,
    isOwnedAndDeletable: s.exercise.createdByUserId === userId && !usedByOthers.has(s.exercise.id),
  }));
}

export async function getCommunityExercisesForUser(userId: string) {
  // All settings this user already has (adopted, hidden, own)
  const userSettings = await prisma.userExerciseSetting.findMany({
    where: { userId },
    select: { exerciseId: true },
  });
  const alreadyLinkedIds = new Set([
    ...userSettings.map((s) => s.exerciseId),
  ]);

  // Also exclude exercises the user created themselves
  const ownExercises = await prisma.exercise.findMany({
    where: { createdByUserId: userId },
    select: { id: true },
  });
  ownExercises.forEach((e) => alreadyLinkedIds.add(e.id));

  const community = await prisma.exercise.findMany({
    where: {
      isDefault: false,
      id: { notIn: [...alreadyLinkedIds] },
    },
    select: { id: true, name: true, muscleGroup: true },
    orderBy: [{ muscleGroup: "asc" }, { name: "asc" }],
  });

  return community.map((e) => ({
    id: e.id,
    name: e.name,
    muscleGroup: e.muscleGroup as MuscleGroup,
  }));
}

export async function adoptExercise(userId: string, exerciseId: string) {
  return prisma.userExerciseSetting.upsert({
    where: { userId_exerciseId: { userId, exerciseId } },
    update: { isHidden: false },
    create: { userId, exerciseId, isHidden: false, isPinned: false, sortOrder: 0 },
  });
}

export async function deleteExerciseData(userId: string, exerciseId: string) {
  const exercise = await prisma.exercise.findUnique({
    where: { id: exerciseId },
    select: { isDefault: true, createdByUserId: true },
  });
  if (!exercise) return;

  // Delete all ExerciseSets belonging to this user for this exercise
  await prisma.exerciseSet.deleteMany({
    where: { exerciseId, session: { userId } },
  });

  if (!exercise.isDefault && exercise.createdByUserId === userId) {
    // Custom exercise owned by user — delete the record entirely (cascades settings)
    await prisma.exercise.delete({ where: { id: exerciseId } });
  } else {
    // Default exercise — mark hidden so it no longer appears for this user
    await prisma.userExerciseSetting.upsert({
      where: { userId_exerciseId: { userId, exerciseId } },
      update: { isHidden: true },
      create: { userId, exerciseId, isHidden: true, isPinned: false, sortOrder: 0 },
    });
  }
}

export async function createCustomExercise(
  userId: string,
  data: { name: string; muscleGroup: MuscleGroup; isBodyweight: boolean }
) {
  return prisma.exercise.create({
    data: {
      name: data.name.toUpperCase().trim(),
      muscleGroup: data.muscleGroup,
      isBodyweight: data.isBodyweight,
      isDefault: false,
      createdByUserId: userId,
    },
  });
}

export async function togglePinExercise(userId: string, exerciseId: string) {
  const existing = await prisma.userExerciseSetting.findUnique({
    where: { userId_exerciseId: { userId, exerciseId } },
  });

  if (existing) {
    return prisma.userExerciseSetting.update({
      where: { id: existing.id },
      data: { isPinned: !existing.isPinned },
    });
  }

  return prisma.userExerciseSetting.create({
    data: { userId, exerciseId, isPinned: true, sortOrder: 0 },
  });
}

export async function setPreferredSets(userId: string, exerciseId: string, count: number) {
  return prisma.userExerciseSetting.upsert({
    where: { userId_exerciseId: { userId, exerciseId } },
    create: { userId, exerciseId, preferredSets: count },
    update: { preferredSets: count },
  });
}

export async function reorderExercises(userId: string, orderedIds: string[]) {
  await prisma.$transaction(
    orderedIds.map((exerciseId, index) =>
      prisma.userExerciseSetting.upsert({
        where: { userId_exerciseId: { userId, exerciseId } },
        update: { sortOrder: index },
        create: { userId, exerciseId, sortOrder: index, isPinned: false },
      })
    )
  );
}
