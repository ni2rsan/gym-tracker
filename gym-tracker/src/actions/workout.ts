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

export async function deleteWorkoutSessionByDate(date: string): Promise<ActionResult> {
  try {
    const parsed = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).safeParse(date);
    if (!parsed.success) return { success: false, error: "Invalid date." };
    const userId = await getCurrentUserId();
    await workoutService.deleteWorkoutSessionByDate(userId, parsed.data);
    revalidatePath("/workout");
    revalidatePath("/reports");
    revalidatePath("/planner");
    revalidatePath("/logs");
    return { success: true };
  } catch (error) {
    console.error("deleteWorkoutSessionByDate error:", error);
    return { success: false, error: "Failed to delete workout." };
  }
}

export async function deleteTrackedBlockByDate(date: string, blockType: string): Promise<ActionResult<{ removedGroups: string[] }>> {
  try {
    const parsed = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).safeParse(date);
    if (!parsed.success) return { success: false, error: "Invalid date." };
    const muscleGroups =
      blockType === "FULL_BODY" ? ["UPPER_BODY", "LOWER_BODY", "BODYWEIGHT"] :
      blockType === "CARDIO" ? ["CARDIO"] :
      [blockType];
    const userId = await getCurrentUserId();
    await workoutService.deleteWorkoutSetsByMuscleGroups(userId, parsed.data, muscleGroups);
    revalidatePath("/workout");
    revalidatePath("/reports");
    revalidatePath("/planner");
    return { success: true, data: { removedGroups: muscleGroups } };
  } catch (error) {
    console.error("deleteTrackedBlockByDate error:", error);
    return { success: false, error: "Failed to delete tracking." };
  }
}

export async function deleteExerciseTracking(exerciseId: string, date: string): Promise<ActionResult> {
  try {
    const parsed = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).safeParse(date);
    if (!parsed.success) return { success: false, error: "Invalid date." };
    const userId = await getCurrentUserId();
    await workoutService.deleteExerciseSetsForDate(userId, exerciseId, parsed.data);
    revalidatePath("/workout");
    revalidatePath("/reports");
    revalidatePath("/logs");
    return { success: true };
  } catch (error) {
    console.error("deleteExerciseTracking error:", error);
    return { success: false, error: "Failed to delete tracking." };
  }
}

export async function getWorkoutSummaryForDate(date: string): Promise<ActionResult<workoutService.WorkoutExerciseSummary[]>> {
  try {
    const parsed = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).safeParse(date);
    if (!parsed.success) return { success: false, error: "Invalid date." };
    const userId = await getCurrentUserId();
    const data = await workoutService.getWorkoutSummaryForDate(userId, parsed.data);
    return { success: true, data };
  } catch (error) {
    console.error("getWorkoutSummaryForDate error:", error);
    return { success: false, error: "Failed to load workout summary." };
  }
}

export async function getWorkoutsForRange(
  startDate: string,
  endDate: string
): Promise<ActionResult<workoutService.WorkoutDayData[]>> {
  try {
    const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
    if (!dateSchema.safeParse(startDate).success || !dateSchema.safeParse(endDate).success) {
      return { success: false, error: "Invalid date range." };
    }
    const userId = await getCurrentUserId();
    const data = await workoutService.getWorkoutsForDateRange(userId, startDate, endDate);
    return { success: true, data };
  } catch (error) {
    console.error("getWorkoutsForRange error:", error);
    return { success: false, error: "Failed to load workouts." };
  }
}

export async function changeWorkoutSessionDate(sessionId: string, newDate: string): Promise<ActionResult> {
  try {
    const sessionParsed = z.string().cuid().safeParse(sessionId);
    const dateParsed = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).safeParse(newDate);
    if (!sessionParsed.success || !dateParsed.success) return { success: false, error: "Invalid input." };
    const userId = await getCurrentUserId();
    await workoutService.changeWorkoutSessionDate(userId, sessionParsed.data, dateParsed.data);
    revalidatePath("/workout");
    revalidatePath("/reports");
    revalidatePath("/planner");
    revalidatePath("/logs");
    return { success: true };
  } catch (error) {
    console.error("changeWorkoutSessionDate error:", error);
    return { success: false, error: "Failed to update date." };
  }
}
