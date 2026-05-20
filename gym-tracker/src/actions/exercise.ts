"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUserId, requireAdmin } from "@/server/auth-helpers";
import * as exerciseService from "@/server/services/exerciseService";
import { MuscleGroup } from "@/generated/prisma/client";
import { prisma } from "@/server/prisma";
import type { ActionResult } from "@/core/types/common";

const CreateExerciseSchema = z.object({
  name: z.string().min(1).max(100),
  muscleGroup: z.nativeEnum(MuscleGroup),
  isBodyweight: z.boolean(),
});

const ExerciseIdSchema = z.string().min(1);
const PreferredSetsSchema = z.number().int().min(1).max(20);

export async function getExercises(): Promise<
  ActionResult<Awaited<ReturnType<typeof exerciseService.getExercisesForUser>>>
> {
  try {
    const userId = await getCurrentUserId();
    const exercises = await exerciseService.getExercisesForUser(userId);
    return { success: true, data: exercises };
  } catch (error) {
    console.error("getExercises error:", error);
    return { success: false, error: "Failed to load exercises." };
  }
}

export async function createExercise(formData: unknown): Promise<ActionResult> {
  try {
    const userId = await getCurrentUserId();
    const parsed = CreateExerciseSchema.safeParse(formData);
    if (!parsed.success) {
      return { success: false, error: "Invalid exercise data." };
    }
    await exerciseService.createCustomExercise(userId, parsed.data);
    revalidatePath("/workout");
    return { success: true };
  } catch (error) {
    console.error("createExercise error:", error);
    return { success: false, error: "Failed to create exercise." };
  }
}

export async function togglePin(exerciseId: unknown): Promise<ActionResult> {
  try {
    const parsed = ExerciseIdSchema.safeParse(exerciseId);
    if (!parsed.success) return { success: false, error: "Invalid exercise ID." };
    const userId = await getCurrentUserId();
    await exerciseService.togglePinExercise(userId, parsed.data);
    revalidatePath("/workout");
    return { success: true };
  } catch (error) {
    console.error("togglePin error:", error);
    return { success: false, error: "Failed to update pin." };
  }
}

const ReorderSchema = z.array(z.string().min(1)).max(500);

export async function reorderExercises(orderedIds: unknown): Promise<ActionResult> {
  try {
    const userId = await getCurrentUserId();
    const parsed = ReorderSchema.safeParse(orderedIds);
    if (!parsed.success) return { success: false, error: "Invalid exercise order." };
    await exerciseService.reorderExercises(userId, parsed.data);
    revalidatePath("/workout");
    return { success: true };
  } catch (error) {
    console.error("reorderExercises error:", error);
    return { success: false, error: "Failed to reorder exercises." };
  }
}

export async function getCommunityExercises(): Promise<
  ActionResult<Awaited<ReturnType<typeof exerciseService.getCommunityExercisesForUser>>>
> {
  try {
    const userId = await getCurrentUserId();
    const data = await exerciseService.getCommunityExercisesForUser(userId);
    return { success: true, data };
  } catch (error) {
    console.error("getCommunityExercises error:", error);
    return { success: false, error: "Failed to load community exercises." };
  }
}

export async function adoptExercise(exerciseId: unknown): Promise<ActionResult> {
  try {
    const parsed = ExerciseIdSchema.safeParse(exerciseId);
    if (!parsed.success) return { success: false, error: "Invalid exercise ID." };
    const userId = await getCurrentUserId();
    await exerciseService.adoptExercise(userId, parsed.data);
    revalidatePath("/workout");
    return { success: true };
  } catch (error) {
    console.error("adoptExercise error:", error);
    return { success: false, error: "Failed to add exercise." };
  }
}

export async function getHiddenExercises(): Promise<
  ActionResult<Awaited<ReturnType<typeof exerciseService.getHiddenExercisesForUser>>>
> {
  try {
    const userId = await getCurrentUserId();
    const data = await exerciseService.getHiddenExercisesForUser(userId);
    return { success: true, data };
  } catch (error) {
    console.error("getHiddenExercises error:", error);
    return { success: false, error: "Failed to load hidden exercises." };
  }
}

export async function unhideExercise(exerciseId: unknown): Promise<ActionResult> {
  try {
    const parsed = ExerciseIdSchema.safeParse(exerciseId);
    if (!parsed.success) return { success: false, error: "Invalid exercise ID." };
    const userId = await getCurrentUserId();
    await exerciseService.unhideExercise(userId, parsed.data);
    revalidatePath("/workout");
    return { success: true };
  } catch (error) {
    console.error("unhideExercise error:", error);
    return { success: false, error: "Failed to restore exercise." };
  }
}

export async function hideExercise(exerciseId: unknown): Promise<ActionResult> {
  try {
    const parsed = ExerciseIdSchema.safeParse(exerciseId);
    if (!parsed.success) return { success: false, error: "Invalid exercise ID." };
    const userId = await getCurrentUserId();
    await exerciseService.hideExercise(userId, parsed.data);
    revalidatePath("/workout");
    return { success: true };
  } catch (error) {
    console.error("hideExercise error:", error);
    return { success: false, error: "Failed to remove exercise." };
  }
}

export async function setPreferredSets(exerciseId: unknown, count: unknown): Promise<ActionResult> {
  try {
    const parsedId = ExerciseIdSchema.safeParse(exerciseId);
    const parsedCount = PreferredSetsSchema.safeParse(count);
    if (!parsedId.success || !parsedCount.success) return { success: false, error: "Invalid input." };
    const userId = await getCurrentUserId();
    await exerciseService.setPreferredSets(userId, parsedId.data, parsedCount.data);
    return { success: true };
  } catch (error) {
    console.error("setPreferredSets error:", error);
    return { success: false, error: "Failed to save set preference." };
  }
}

export async function adminDeleteExercise(exerciseId: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    await prisma.exercise.delete({ where: { id: exerciseId } });
    revalidatePath("/workout");
    revalidatePath("/admin/exercises");
    return { success: true };
  } catch (error) {
    console.error("adminDeleteExercise error:", error);
    return { success: false, error: "Failed to delete exercise." };
  }
}

export async function adminUpdateExercise(
  exerciseId: string,
  data: { name?: string; isCompound?: boolean },
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const updates: { name?: string; isCompound?: boolean } = {};
    if (data.name !== undefined) updates.name = data.name.toUpperCase().trim();
    if (data.isCompound !== undefined) updates.isCompound = data.isCompound;
    if (Object.keys(updates).length === 0) return { success: true };
    await prisma.exercise.update({ where: { id: exerciseId }, data: updates });
    revalidatePath("/workout");
    revalidatePath("/admin/exercises");
    return { success: true };
  } catch (error) {
    console.error("adminUpdateExercise error:", error);
    return { success: false, error: "Failed to update exercise." };
  }
}

export async function deleteExerciseData(exerciseId: unknown): Promise<ActionResult> {
  try {
    const parsed = ExerciseIdSchema.safeParse(exerciseId);
    if (!parsed.success) return { success: false, error: "Invalid exercise ID." };
    const userId = await getCurrentUserId();
    await exerciseService.deleteExerciseData(userId, parsed.data);
    revalidatePath("/workout");
    revalidatePath("/reports");
    revalidatePath("/logs");
    return { success: true };
  } catch (error) {
    console.error("deleteExerciseData error:", error);
    return { success: false, error: "Failed to delete exercise data." };
  }
}
