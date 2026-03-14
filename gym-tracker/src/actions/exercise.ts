"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUserId, requireAdmin } from "@/lib/auth-helpers";
import * as exerciseService from "@/lib/services/exerciseService";
import { MuscleGroup } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/types";

const CreateExerciseSchema = z.object({
  name: z.string().min(1).max(100),
  muscleGroup: z.nativeEnum(MuscleGroup),
  isBodyweight: z.boolean(),
});

export async function getExercises(): Promise<ActionResult<Awaited<ReturnType<typeof exerciseService.getExercisesForUser>>>> {
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

export async function togglePin(exerciseId: string): Promise<ActionResult> {
  try {
    const userId = await getCurrentUserId();
    await exerciseService.togglePinExercise(userId, exerciseId);
    revalidatePath("/workout");
    return { success: true };
  } catch (error) {
    console.error("togglePin error:", error);
    return { success: false, error: "Failed to update pin." };
  }
}

export async function reorderExercises(orderedIds: string[]): Promise<ActionResult> {
  try {
    const userId = await getCurrentUserId();
    await exerciseService.reorderExercises(userId, orderedIds);
    revalidatePath("/workout");
    return { success: true };
  } catch (error) {
    console.error("reorderExercises error:", error);
    return { success: false, error: "Failed to reorder exercises." };
  }
}

export async function getCommunityExercises(): Promise<ActionResult<Awaited<ReturnType<typeof exerciseService.getCommunityExercisesForUser>>>> {
  try {
    const userId = await getCurrentUserId();
    const data = await exerciseService.getCommunityExercisesForUser(userId);
    return { success: true, data };
  } catch (error) {
    console.error("getCommunityExercises error:", error);
    return { success: false, error: "Failed to load community exercises." };
  }
}

export async function adoptExercise(exerciseId: string): Promise<ActionResult> {
  try {
    const userId = await getCurrentUserId();
    await exerciseService.adoptExercise(userId, exerciseId);
    revalidatePath("/workout");
    return { success: true };
  } catch (error) {
    console.error("adoptExercise error:", error);
    return { success: false, error: "Failed to add exercise." };
  }
}

export async function getHiddenExercises(): Promise<ActionResult<Awaited<ReturnType<typeof exerciseService.getHiddenExercisesForUser>>>> {
  try {
    const userId = await getCurrentUserId();
    const data = await exerciseService.getHiddenExercisesForUser(userId);
    return { success: true, data };
  } catch (error) {
    console.error("getHiddenExercises error:", error);
    return { success: false, error: "Failed to load hidden exercises." };
  }
}

export async function unhideExercise(exerciseId: string): Promise<ActionResult> {
  try {
    const userId = await getCurrentUserId();
    await exerciseService.unhideExercise(userId, exerciseId);
    revalidatePath("/workout");
    return { success: true };
  } catch (error) {
    console.error("unhideExercise error:", error);
    return { success: false, error: "Failed to restore exercise." };
  }
}

export async function hideExercise(exerciseId: string): Promise<ActionResult> {
  try {
    const userId = await getCurrentUserId();
    await exerciseService.hideExercise(userId, exerciseId);
    revalidatePath("/workout");
    return { success: true };
  } catch (error) {
    console.error("hideExercise error:", error);
    return { success: false, error: "Failed to remove exercise." };
  }
}

export async function setPreferredSets(exerciseId: string, count: number): Promise<ActionResult> {
  try {
    const userId = await getCurrentUserId();
    await exerciseService.setPreferredSets(userId, exerciseId, count);
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
  data: { name?: string; isCompound?: boolean }
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

export async function deleteExerciseData(exerciseId: string): Promise<ActionResult> {
  try {
    const userId = await getCurrentUserId();
    await exerciseService.deleteExerciseData(userId, exerciseId);
    revalidatePath("/workout");
    revalidatePath("/reports");
    revalidatePath("/logs");
    return { success: true };
  } catch (error) {
    console.error("deleteExerciseData error:", error);
    return { success: false, error: "Failed to delete exercise data." };
  }
}
