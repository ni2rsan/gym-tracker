"use server";

import { getCurrentUserId } from "@/lib/auth-helpers";
import * as reportService from "@/lib/services/reportService";
import type { ActionResult, TimeRange } from "@/types";

export async function getWeightTrend(range: TimeRange) {
  try {
    const userId = await getCurrentUserId();
    const data = await reportService.getWeightTrendData(userId, range);
    return { success: true, data };
  } catch (error) {
    console.error("getWeightTrend error:", error);
    return { success: false, error: "Failed to load weight trend." };
  }
}

export async function getExerciseProgress(exerciseId: string, range: TimeRange) {
  try {
    const userId = await getCurrentUserId();
    const data = await reportService.getExerciseProgressData(userId, exerciseId, range);
    return { success: true, data };
  } catch (error) {
    console.error("getExerciseProgress error:", error);
    return { success: false, error: "Failed to load exercise progress." };
  }
}

export async function getPRs(): Promise<ActionResult<Awaited<ReturnType<typeof reportService.getPersonalRecords>>>> {
  try {
    const userId = await getCurrentUserId();
    const data = await reportService.getPersonalRecords(userId);
    return { success: true, data };
  } catch (error) {
    console.error("getPRs error:", error);
    return { success: false, error: "Failed to load PRs." };
  }
}

export async function getDashboardStats() {
  try {
    const userId = await getCurrentUserId();
    const data = await reportService.getDashboardStats(userId);
    return { success: true, data };
  } catch (error) {
    console.error("getDashboardStats error:", error);
    return { success: false, error: "Failed to load dashboard stats." };
  }
}
