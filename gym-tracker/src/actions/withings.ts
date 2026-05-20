"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/server/auth-helpers";
import { deactivateWithingsConnection } from "@/server/services/withingsService";
import type { ActionResult } from "@/core/types/common";

export async function disconnectWithings(): Promise<ActionResult> {
  try {
    const userId = await getCurrentUserId();
    await deactivateWithingsConnection(userId);
    revalidatePath("/workout");
    return { success: true };
  } catch (error) {
    console.error("disconnectWithings error:", error);
    return { success: false, error: "Failed to disconnect Withings." };
  }
}
