"use server";

import { z } from "zod";
import { getCurrentUserId } from "@/server/auth-helpers";
import { prisma } from "@/server/prisma";
import type { ActionResult } from "@/core/types/common";

const UpdateProfileSchema = z.object({
  username: z
    .string()
    .min(2, "At least 2 characters")
    .max(30, "Max 30 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, underscores")
    .nullable()
    .optional(),
  heightCm: z.number().int().min(50).max(300).nullable().optional(),
  profileImageBase64: z.string().max(2_000_000).nullable().optional(), // ~1.5 MB image limit
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
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid data." };
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

/**
 * GDPR Art. 20 — Export all user data as JSON
 */
export async function exportMyData(): Promise<ActionResult<Record<string, unknown>>> {
  try {
    const userId = await getCurrentUserId();

    const [user, sessions, sets, metrics, planned, friendships, privacy, withings] =
      await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: {
            name: true,
            username: true,
            email: true,
            heightCm: true,
            createdAt: true,
          },
        }),
        prisma.workoutSession.findMany({
          where: { userId, deletedAt: null },
          orderBy: { date: "desc" },
          select: { id: true, date: true, createdAt: true },
        }),
        prisma.exerciseSet.findMany({
          where: { session: { userId }, deletedAt: null },
          orderBy: { recordedAt: "desc" },
          select: {
            exerciseId: true,
            setNumber: true,
            reps: true,
            weightKg: true,
            recordedAt: true,
            exercise: { select: { name: true } },
          },
        }),
        prisma.bodyMetricEntry.findMany({
          where: { userId, deletedAt: null },
          orderBy: { recordedAt: "desc" },
          select: {
            weightKg: true,
            bodyFatPct: true,
            fatMassKg: true,
            muscleMassKg: true,
            recordedAt: true,
            source: true,
            notes: true,
          },
        }),
        prisma.plannedWorkoutSeries.findMany({
          where: { userId, deletedAt: null },
          select: { id: true, blockType: true, ruleType: true, startDate: true, createdAt: true },
        }),
        prisma.friendship.findMany({
          where: {
            deletedAt: null,
            OR: [{ senderId: userId }, { receiverId: userId }],
            status: "ACCEPTED",
          },
          select: { senderId: true, receiverId: true, createdAt: true },
        }),
        prisma.userPrivacySettings.findUnique({
          where: { userId },
          select: { shareWeight: true, shareBodyFat: true, sharePRs: true },
        }),
        prisma.withingsConnection.findUnique({
          where: { userId },
          select: { isActive: true, connectedAt: true, lastSyncAt: true },
        }),
      ]);

    const data = {
      exportedAt: new Date().toISOString(),
      profile: user,
      workoutSessions: sessions.map((s) => ({
        ...s,
        date: s.date.toISOString().split("T")[0],
      })),
      exerciseSets: sets.map((s) => ({
        exercise: s.exercise.name,
        setNumber: s.setNumber,
        reps: s.reps,
        weightKg: s.weightKg ? Number(s.weightKg) : null,
        recordedAt: s.recordedAt.toISOString(),
      })),
      bodyMetrics: metrics.map((m) => ({
        weightKg: m.weightKg ? Number(m.weightKg) : null,
        bodyFatPct: m.bodyFatPct ? Number(m.bodyFatPct) : null,
        fatMassKg: m.fatMassKg ? Number(m.fatMassKg) : null,
        muscleMassKg: m.muscleMassKg ? Number(m.muscleMassKg) : null,
        recordedAt: m.recordedAt.toISOString(),
        source: m.source,
        notes: m.notes,
      })),
      plannedSeries: planned,
      friendships: friendships.map((f) => ({
        friendUserId: f.senderId === userId ? f.receiverId : f.senderId,
        since: f.createdAt.toISOString(),
      })),
      privacySettings: privacy,
      withingsConnection: withings
        ? { isActive: withings.isActive, connectedAt: withings.connectedAt?.toISOString() }
        : null,
    };

    return { success: true, data };
  } catch {
    return { success: false, error: "Failed to export data." };
  }
}

/**
 * GDPR Art. 17 — Soft-delete all user data (account deactivation).
 * Does NOT physically delete the User row — marks all content as deleted
 * and anonymises the profile so the account is effectively deactivated.
 */
export async function deleteMyAccount(): Promise<ActionResult> {
  try {
    const userId = await getCurrentUserId();
    const now = new Date();

    await prisma.$transaction([
      // Soft-delete all workout data
      prisma.exerciseSet.updateMany({
        where: { session: { userId }, deletedAt: null },
        data: { deletedAt: now },
      }),
      prisma.workoutSession.updateMany({
        where: { userId, deletedAt: null },
        data: { deletedAt: now },
      }),
      // Soft-delete all body metrics
      prisma.bodyMetricEntry.updateMany({
        where: { userId, deletedAt: null },
        data: { deletedAt: now },
      }),
      // Soft-delete all planner data (series → cascades to blocks → exercises)
      prisma.plannedWorkoutSeries.updateMany({
        where: { userId, deletedAt: null },
        data: { deletedAt: now },
      }),
      // Soft-delete friendships
      prisma.friendship.updateMany({
        where: { OR: [{ senderId: userId }, { receiverId: userId }], deletedAt: null },
        data: { deletedAt: now },
      }),
      // Deactivate Withings connection
      prisma.withingsConnection.updateMany({
        where: { userId },
        data: { isActive: false },
      }),
      // Anonymise profile (keep the User row for Auth.js session integrity)
      prisma.user.update({
        where: { id: userId },
        data: {
          username: null,
          profileImageBase64: null,
          heightCm: null,
          name: "Deleted User",
        },
      }),
    ]);

    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete account." };
  }
}
