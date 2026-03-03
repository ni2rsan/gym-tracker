"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth-helpers";
import * as metricsService from "@/lib/services/metricsService";
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
