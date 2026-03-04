"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth-helpers";
import * as plannerService from "@/lib/services/plannerService";
import type { ActionResult } from "@/types";

const BlockTypeSchema = z.enum(["UPPER_BODY", "LOWER_BODY", "FULL_BODY", "CARDIO"]);
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
