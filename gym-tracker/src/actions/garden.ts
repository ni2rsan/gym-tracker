"use server";

import { getCurrentUserId } from "@/lib/auth-helpers";
import * as gardenService from "@/lib/services/gardenService";
import type { ActionResult } from "@/types";

export type GardenData = {
  stardustTotal: number;
  trees: gardenService.TreeState[];
};

export async function getGardenData(): Promise<ActionResult<GardenData>> {
  try {
    const userId = await getCurrentUserId();
    const stardustTotal = await gardenService.getOrSyncStardust(userId);
    const trees = gardenService.getGardenState(stardustTotal);
    return { success: true, data: { stardustTotal, trees } };
  } catch (error) {
    console.error("getGardenData error:", error);
    return { success: false, error: "Failed to load garden." };
  }
}

/**
 * Awards stardust earned during a workout session.
 * Returns the new total after increment.
 */
export async function awardSessionStardust(
  count: number
): Promise<ActionResult<{ newTotal: number }>> {
  if (count <= 0) return { success: true, data: { newTotal: 0 } };
  try {
    const userId = await getCurrentUserId();
    // Ensure user is synced before awarding so total is accurate
    await gardenService.getOrSyncStardust(userId);
    const newTotal = await gardenService.awardStardust(userId, count);
    return { success: true, data: { newTotal } };
  } catch (error) {
    console.error("awardSessionStardust error:", error);
    return { success: false, error: "Failed to award stardust." };
  }
}
