"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUserId, requireAdmin } from "@/lib/auth-helpers";
import * as requestService from "@/lib/services/requestService";
import { RequestStatus } from "@/generated/prisma/client";
import type { ActionResult, UserRequestItem } from "@/types";

const SubmitRequestSchema = z.object({
  type: z.enum(["BUG", "FEATURE"]),
  text: z.string().min(1).max(5000),
  screenshotBase64: z.string().nullable().optional(),
});

export async function submitRequest(data: unknown): Promise<ActionResult> {
  try {
    const userId = await getCurrentUserId();
    const parsed = SubmitRequestSchema.safeParse(data);
    if (!parsed.success) return { success: false, error: "Invalid request data." };
    await requestService.submitRequest(userId, {
      type: parsed.data.type as import("@/generated/prisma/client").RequestType,
      text: parsed.data.text,
      screenshotBase64: parsed.data.screenshotBase64,
    });
    revalidatePath("/requests");
    return { success: true };
  } catch (error) {
    console.error("submitRequest error:", error);
    return { success: false, error: "Failed to submit request." };
  }
}

export async function getMyRequests(): Promise<ActionResult<UserRequestItem[]>> {
  try {
    const userId = await getCurrentUserId();
    const rows = await requestService.getRequestsForUser(userId);
    const data: UserRequestItem[] = rows.map((r) => ({
      id: r.id,
      type: r.type as UserRequestItem["type"],
      status: r.status as UserRequestItem["status"],
      text: r.text,
      screenshotBase64: r.screenshotBase64,
      adminNote: r.adminNote,
      createdAt: r.createdAt.toISOString(),
    }));
    return { success: true, data };
  } catch (error) {
    console.error("getMyRequests error:", error);
    return { success: false, error: "Failed to load requests." };
  }
}

export async function getAllRequests(): Promise<ActionResult<UserRequestItem[]>> {
  try {
    await requireAdmin();
    const rows = await requestService.getAllRequests();
    const data: UserRequestItem[] = rows.map((r) => ({
      id: r.id,
      type: r.type as UserRequestItem["type"],
      status: r.status as UserRequestItem["status"],
      text: r.text,
      screenshotBase64: r.screenshotBase64,
      adminNote: r.adminNote,
      createdAt: r.createdAt.toISOString(),
      userName: r.user.name ?? undefined,
      userEmail: r.user.email ?? undefined,
    }));
    return { success: true, data };
  } catch (error) {
    console.error("getAllRequests error:", error);
    return { success: false, error: "Failed to load requests." };
  }
}

const UpdateStatusSchema = z.object({
  id: z.string(),
  status: z.enum(["IN_REVIEW", "ACCEPTED", "DECLINED", "DEPLOYED"]),
  adminNote: z.string().nullable().optional(),
});

export async function updateRequestStatus(data: unknown): Promise<ActionResult> {
  try {
    await requireAdmin();
    const parsed = UpdateStatusSchema.safeParse(data);
    if (!parsed.success) return { success: false, error: "Invalid data." };
    await requestService.updateRequestStatus(
      parsed.data.id,
      parsed.data.status as RequestStatus,
      parsed.data.adminNote
    );
    revalidatePath("/requests");
    revalidatePath("/admin/requests");
    return { success: true };
  } catch (error) {
    console.error("updateRequestStatus error:", error);
    return { success: false, error: "Failed to update status." };
  }
}
