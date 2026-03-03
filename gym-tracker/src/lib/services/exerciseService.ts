import { prisma } from "@/lib/prisma";
import { MuscleGroup } from "@/generated/prisma/client";
import type { ExerciseWithSettings } from "@/types";

export async function getExercisesForUser(userId: string): Promise<ExerciseWithSettings[]> {
  const exercises = await prisma.exercise.findMany({
    where: {
      OR: [
        { isDefault: true },
        { createdByUserId: userId },
      ],
    },
    include: {
      userSettings: {
        where: { userId },
      },
    },
    orderBy: [{ muscleGroup: "asc" }, { sortOrder: "asc" }],
  });

  return exercises
    .filter((e) => {
      const setting = e.userSettings[0];
      return !setting?.isHidden;
    })
    .map((e) => {
      const setting = e.userSettings[0];
      return {
        id: e.id,
        name: e.name,
        muscleGroup: e.muscleGroup,
        isDefault: e.isDefault,
        isBodyweight: e.isBodyweight,
        sortOrder: e.sortOrder,
        isPinned: setting?.isPinned ?? false,
        userSortOrder: setting?.sortOrder ?? e.sortOrder,
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
