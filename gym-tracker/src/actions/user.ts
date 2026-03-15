"use server";

import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/types";

const UpdateProfileSchema = z.object({
  username: z
    .string()
    .min(2, "At least 2 characters")
    .max(30, "Max 30 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, underscores")
    .nullable()
    .optional(),
  heightCm: z.number().int().min(50).max(300).nullable().optional(),
  profileImageBase64: z.string().nullable().optional(),
});

export async function getMyProfile(): Promise<
  ActionResult<{
    name: string | null;
    username: string | null;
    email: string | null;
    image: string | null;
    profileImageBase64: string | null;
    heightCm: number | null;
  }>
> {
  try {
    const userId = await getCurrentUserId();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        username: true,
        email: true,
        image: true,
        profileImageBase64: true,
        heightCm: true,
      },
    });
    if (!user) return { success: false, error: "User not found." };
    return { success: true, data: user };
  } catch {
    return { success: false, error: "Failed to load profile." };
  }
}

export async function updateProfile(data: unknown): Promise<ActionResult> {
  try {
    const userId = await getCurrentUserId();
    const parsed = UpdateProfileSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid data." };
    }
    const updates: Record<string, unknown> = {};
    if (parsed.data.username !== undefined) updates.username = parsed.data.username || null;
    if (parsed.data.heightCm !== undefined) updates.heightCm = parsed.data.heightCm;
    if (parsed.data.profileImageBase64 !== undefined)
      updates.profileImageBase64 = parsed.data.profileImageBase64;
    if (Object.keys(updates).length === 0) return { success: true };
    await prisma.user.update({ where: { id: userId }, data: updates });
    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (msg.includes("Unique constraint") || msg.includes("unique")) {
      return { success: false, error: "Username already taken." };
    }
    return { success: false, error: "Failed to update profile." };
  }
}
