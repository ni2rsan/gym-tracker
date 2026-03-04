"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth-helpers";
import * as metricsService from "@/lib/services/metricsService";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/types";

const AddMetricSchema = z.object({
  weightKg: z.coerce.number().positive().max(500).optional().or(z.literal("")),
  bodyFatPct: z.coerce.number().min(1).max(70).optional().or(z.literal("")),
  notes: z.string().max(500).optional(),
}).refine(
  (data) => (data.weightKg !== "" && data.weightKg != null) || (data.bodyFatPct !== "" && data.bodyFatPct != null),
  { message: "At least one of weight or body fat % is required." }
);

export async function addBodyMetric(formData: unknown): Promise<ActionResult> {
  try {
    const userId = await getCurrentUserId();
    const parsed = AddMetricSchema.safeParse(formData);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid data." };
    }

    const { weightKg, bodyFatPct, notes } = parsed.data;
    await metricsService.addBodyMetric(userId, {
      weightKg: weightKg !== "" && weightKg != null ? Number(weightKg) : null,
      bodyFatPct: bodyFatPct !== "" && bodyFatPct != null ? Number(bodyFatPct) : null,
      notes,
    });

    revalidatePath("/workout");
    revalidatePath("/reports");
    return { success: true };
  } catch (error) {
    console.error("addBodyMetric error:", error);
    return { success: false, error: "Failed to save metrics. Please try again." };
  }
}

export async function revertToWithings(): Promise<ActionResult> {
  try {
    const userId = await getCurrentUserId();
    const withings = await metricsService.getLatestWithingsMetric(userId);
    if (withings.weightKg == null && withings.bodyFatPct == null) {
      return { success: false, error: "No Withings data to revert to." };
    }
    await prisma.bodyMetricEntry.create({
      data: {
        userId,
        weightKg: withings.weightKg,
        bodyFatPct: withings.bodyFatPct,
        source: "withings",
      },
    });
    revalidatePath("/workout");
    return { success: true };
  } catch (error) {
    console.error("revertToWithings error:", error);
    return { success: false, error: "Failed to revert." };
  }
}

export async function deleteBodyMetricEntry(entryId: string): Promise<ActionResult> {
  try {
    const parsed = z.string().cuid().safeParse(entryId);
    if (!parsed.success) return { success: false, error: "Invalid entry ID." };
    const userId = await getCurrentUserId();
    await metricsService.deleteBodyMetricEntry(userId, parsed.data);
    revalidatePath("/workout");
    revalidatePath("/reports");
    revalidatePath("/logs");
    return { success: true };
  } catch (error) {
    console.error("deleteBodyMetricEntry error:", error);
    return { success: false, error: "Failed to delete entry." };
  }
}

export async function getBodyMetricsHistory(): Promise<ActionResult<Array<{
  id: string;
  weightKg: string | null;
  bodyFatPct: string | null;
  recordedAt: string;
  notes: string | null;
}>>> {
  try {
    const userId = await getCurrentUserId();
    const entries = await metricsService.getBodyMetrics(userId, "all");
    return {
      success: true,
      data: entries.reverse().map((e) => ({
        id: e.id,
        weightKg: e.weightKg ? String(e.weightKg) : null,
        bodyFatPct: e.bodyFatPct ? String(e.bodyFatPct) : null,
        recordedAt: e.recordedAt.toISOString(),
        notes: e.notes,
      })),
    };
  } catch (error) {
    console.error("getBodyMetricsHistory error:", error);
    return { success: false, error: "Failed to load metrics." };
  }
}
