"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth-helpers";
import * as plannerService from "@/lib/services/plannerService";
import type { ActionResult } from "@/types";

const BlockTypeSchema = z.enum(["UPPER_BODY", "LOWER_BODY", "BODYWEIGHT", "FULL_BODY", "CARDIO"]);
const SeriesRuleTypeSchema = z.enum(["WEEKDAYS", "INTERVAL"]);
const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const CreateBlockSchema = z.object({
  date: DateSchema,
  blockType: BlockTypeSchema,
});

const CreateSeriesSchema = z.object({
  blockType: BlockTypeSchema,
  ruleType: SeriesRuleTypeSchema,
  weekdays: z.array(z.number().int().min(1).max(7)).default([]),
  intervalDays: z.number().int().min(1).max(365).optional(),
  startDate: DateSchema,
});

export type PlannerBlockInfo = {
  id: string;
  blockType: string;
  sorryExcused: boolean;
};

export async function getBlocksForRange(
  startDate: string,
  endDate: string
): Promise<ActionResult<{ blocksByDate: Record<string, PlannerBlockInfo[]>; sorryRemaining: number }>> {
  try {
    const userId = await getCurrentUserId();
    if (!DateSchema.safeParse(startDate).success || !DateSchema.safeParse(endDate).success) {
      return { success: false, error: "Invalid date range." };
    }
    const [blocks, sorryData] = await Promise.all([
      plannerService.getPlannedWorkoutsInRange(userId, startDate, endDate),
      plannerService.getSorryTokensThisMonth(userId),
    ]);
    const blocksByDate: Record<string, PlannerBlockInfo[]> = {};
    for (const block of blocks) {
      const d = block.date;
      const iso = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
      if (!blocksByDate[iso]) blocksByDate[iso] = [];
      blocksByDate[iso].push({ id: block.id, blockType: block.blockType, sorryExcused: block.sorryExcused });
    }
    return { success: true, data: { blocksByDate, sorryRemaining: Math.max(0, 3 - sorryData.usedCount) } };
  } catch (e) {
    console.error("getBlocksForRange error:", e);
    return { success: false, error: "Failed to load planner blocks." };
  }
}

export async function createBlock(formData: unknown): Promise<ActionResult> {
  try {
    const userId = await getCurrentUserId();
    const parsed = CreateBlockSchema.safeParse(formData);
    if (!parsed.success) return { success: false, error: "Invalid data." };
    await plannerService.createOneOffBlock(userId, parsed.data.date, parsed.data.blockType);
    revalidatePath("/planner");
    return { success: true };
  } catch (e) {
    console.error("createBlock error:", e);
    return { success: false, error: "Failed to create block." };
  }
}

export async function createSeries(formData: unknown): Promise<ActionResult<{ count: number }>> {
  try {
    const userId = await getCurrentUserId();
    const parsed = CreateSeriesSchema.safeParse(formData);
    if (!parsed.success) return { success: false, error: "Invalid data." };
    const { count } = await plannerService.createSeries(userId, parsed.data);
    revalidatePath("/planner");
    return { success: true, data: { count } };
  } catch (e) {
    console.error("createSeries error:", e);
    return { success: false, error: "Failed to create series." };
  }
}

export async function deleteBlock(blockId: string): Promise<ActionResult> {
  try {
    const userId = await getCurrentUserId();
    await plannerService.deleteBlock(userId, blockId);
    revalidatePath("/planner");
    return { success: true };
  } catch (e) {
    console.error("deleteBlock error:", e);
    return { success: false, error: "Failed to delete block." };
  }
}

export async function deleteSeries(
  seriesId: string,
  fromDate?: string
): Promise<ActionResult> {
  try {
    const userId = await getCurrentUserId();
    await plannerService.deleteSeries(userId, seriesId, fromDate);
    revalidatePath("/planner");
    return { success: true };
  } catch (e) {
    console.error("deleteSeries error:", e);
    return { success: false, error: "Failed to delete series." };
  }
}

export async function updateBlock(
  blockId: string,
  blockType: string
): Promise<ActionResult> {
  try {
    const userId = await getCurrentUserId();
    const parsed = BlockTypeSchema.safeParse(blockType);
    if (!parsed.success) return { success: false, error: "Invalid block type." };
    await plannerService.updateBlock(userId, blockId, parsed.data);
    revalidatePath("/planner");
    return { success: true };
  } catch (e) {
    console.error("updateBlock error:", e);
    return { success: false, error: "Failed to update block." };
  }
}

export async function updateSeries(
  seriesId: string,
  formData: unknown
): Promise<ActionResult> {
  try {
    const userId = await getCurrentUserId();
    const parsed = CreateSeriesSchema.safeParse(formData);
    if (!parsed.success) return { success: false, error: "Invalid data." };
    await plannerService.updateSeries(userId, seriesId, parsed.data);
    revalidatePath("/planner");
    return { success: true };
  } catch (e) {
    console.error("updateSeries error:", e);
    return { success: false, error: "Failed to update series." };
  }
}

// ─── Streak / SORRY actions ────────────────────────────────────────────────

export async function getStreakDataAction(): Promise<ActionResult<plannerService.StreakData>> {
  try {
    const userId = await getCurrentUserId();
    const data = await plannerService.getStreakData(userId);
    return { success: true, data };
  } catch (e) {
    console.error("getStreakDataAction error:", e);
    return { success: false, error: "Failed to load streak data." };
  }
}

/** Delete a series block using a SORRY token (soft-excuses instead of deleting) */
export async function applySorryDeleteBlock(blockId: string): Promise<ActionResult> {
  try {
    const userId = await getCurrentUserId();
    await plannerService.applySorryAndSoftDeleteBlock(userId, blockId);
    revalidatePath("/planner");
    return { success: true };
  } catch (e) {
    console.error("applySorryDeleteBlock error:", e);
    return { success: false, error: "Failed to apply SORRY token." };
  }
}

/** Delete a series block and reset the streak */
export async function deleteBlockResetStreak(blockId: string): Promise<ActionResult> {
  try {
    const userId = await getCurrentUserId();
    await plannerService.deleteBlockWithReset(userId, blockId);
    revalidatePath("/planner");
    return { success: true };
  } catch (e) {
    console.error("deleteBlockResetStreak error:", e);
    return { success: false, error: "Failed to delete block." };
  }
}

/** Update series config using a SORRY token (preserves streak) */
export async function updateSeriesUseSorry(
  seriesId: string,
  formData: unknown
): Promise<ActionResult> {
  try {
    const userId = await getCurrentUserId();
    const parsed = CreateSeriesSchema.safeParse(formData);
    if (!parsed.success) return { success: false, error: "Invalid data." };
    await plannerService.updateSeriesWithSorry(userId, seriesId, parsed.data);
    revalidatePath("/planner");
    return { success: true };
  } catch (e) {
    console.error("updateSeriesUseSorry error:", e);
    return { success: false, error: "Failed to update series." };
  }
}

/** Excuse all missed blocks on a day using one sorry token */
export async function excuseMissedDay(date: string): Promise<ActionResult> {
  try {
    const userId = await getCurrentUserId();
    const parsed = DateSchema.safeParse(date);
    if (!parsed.success) return { success: false, error: "Invalid date." };
    await plannerService.excuseMissedDay(userId, parsed.data);
    revalidatePath("/planner");
    return { success: true };
  } catch (e) {
    console.error("excuseMissedDay error:", e);
    return { success: false, error: "Failed to apply sorry token." };
  }
}

/** Revoke a sorry excuse on a today/future date (reversible) */
export async function revokeSorryExcuse(date: string): Promise<ActionResult> {
  try {
    const userId = await getCurrentUserId();
    const parsed = DateSchema.safeParse(date);
    if (!parsed.success) return { success: false, error: "Invalid date." };
    await plannerService.revokeSorryExcuse(userId, parsed.data);
    revalidatePath("/planner");
    return { success: true };
  } catch (e) {
    console.error("revokeSorryExcuse error:", e);
    return { success: false, error: "Failed to revoke sorry token." };
  }
}

/** Update series config and reset the streak */
export async function updateSeriesResetStreak(
  seriesId: string,
  formData: unknown
): Promise<ActionResult> {
  try {
    const userId = await getCurrentUserId();
    const parsed = CreateSeriesSchema.safeParse(formData);
    if (!parsed.success) return { success: false, error: "Invalid data." };
    await plannerService.updateSeriesWithReset(userId, seriesId, parsed.data);
    revalidatePath("/planner");
    return { success: true };
  } catch (e) {
    console.error("updateSeriesResetStreak error:", e);
    return { success: false, error: "Failed to update series." };
  }
}
