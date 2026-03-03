"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { deactivateWithingsConnection } from "@/lib/services/withingsService";
import type { ActionResult } from "@/types";

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
