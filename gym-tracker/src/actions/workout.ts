"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth-helpers";
import * as workoutService from "@/lib/services/workoutService";
import type { ActionResult } from "@/types";

const SetSchema = z.object({
  setNumber: z.number().int().min(1).max(10),
  reps: z.coerce.number().int().min(0).max(9999),
  weightKg: z.union([z.coerce.number().min(0).max(9999), z.literal("")]),
});

const ExerciseInputSchema = z.object({
  exerciseId: z.string().min(1),
  sets: z.array(SetSchema),
});

const SaveWorkoutSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  exercises: z.array(ExerciseInputSchema),
});

export async function saveWorkout(formData: unknown): Promise<ActionResult> {
  try {
    const userId = await getCurrentUserId();
    const parsed = SaveWorkoutSchema.safeParse(formData);
    if (!parsed.success) {
      return { success: false, error: "Invalid workout data." };
    }

    await workoutService.saveWorkoutSession(userId, parsed.data.date, parsed.data.exercises);
    revalidatePath("/workout");
    revalidatePath("/reports");
    return { success: true };
  } catch (error) {
    console.error("saveWorkout error:", error);
    return { success: false, error: "Failed to save workout. Please try again." };
  }
}

export async function getWorkoutForDate(date: string): Promise<ActionResult<Record<string, Array<{ setNumber: number; reps: number; weightKg: number | null }>>>> {
  try {
    const userId = await getCurrentUserId();
    const data = await workoutService.getLatestSetsForDate(userId, date);
    return { success: true, data };
  } catch (error) {
    console.error("getWorkoutForDate error:", error);
    return { success: false, error: "Failed to load workout." };
  }
}

export async function getLastKnownSets(): Promise<ActionResult<Record<string, Array<{ setNumber: number; reps: number; weightKg: number | null }>>>> {
  try {
    const userId = await getCurrentUserId();
    const data = await workoutService.getLatestSetsPerExercise(userId);
    return { success: true, data };
  } catch (error) {
    console.error("getLastKnownSets error:", error);
    return { success: false, error: "Failed to load last workout." };
  }
}

export async function getRecentDates(): Promise<ActionResult<string[]>> {
  try {
    const userId = await getCurrentUserId();
    const dates = await workoutService.getRecentWorkoutDates(userId);
    return { success: true, data: dates };
  } catch (error) {
    console.error("getRecentDates error:", error);
    return { success: false, error: "Failed to load workout history." };
  }
}
