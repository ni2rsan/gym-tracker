"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth-helpers";
import * as exerciseService from "@/lib/services/exerciseService";
import { MuscleGroup } from "@/generated/prisma/client";
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
