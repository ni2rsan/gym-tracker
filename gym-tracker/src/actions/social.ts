"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth-helpers";
import {
  sendFriendRequest as svcSend,
  acceptFriendRequest as svcAccept,
  declineFriendRequest as svcDecline,
  removeFriend as svcRemove,
  updatePrivacySettings as svcUpdatePrivacy,
  upsertFriendPrivacyOverride as svcUpsertOverride,
  getFriendProfileData as svcGetProfile,
  getFriends,
  getPendingReceived,
  getPendingSent,
  getPrivacySettings,
  getFriendPrivacyOverride,
} from "@/lib/services/socialService";
import { prisma } from "@/lib/prisma";
import type { ActionResult, FriendProfileData } from "@/types";

// ─── Send friend request ────────────────────────────────────────────────────

const SendRequestSchema = z.object({
  usernameOrEmail: z.string().min(1, "Enter a username or email"),
});

export async function sendFriendRequest(data: unknown): Promise<ActionResult> {
  try {
    const userId = await getCurrentUserId();
    const parsed = SendRequestSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }
    const result = await svcSend(userId, parsed.data.usernameOrEmail);
    if (!result.success) return { success: false, error: result.error };
    revalidatePath("/social");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to send request." };
  }
}

// ─── Accept / decline ───────────────────────────────────────────────────────

export async function acceptFriendRequest(friendshipId: string): Promise<ActionResult> {
  try {
    const userId = await getCurrentUserId();
    await svcAccept(userId, friendshipId);
    revalidatePath("/social");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to accept request." };
  }
}

export async function declineFriendRequest(friendshipId: string): Promise<ActionResult> {
  try {
    const userId = await getCurrentUserId();
    await svcDecline(userId, friendshipId);
    revalidatePath("/social");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to decline request." };
  }
}

// ─── Remove friend ──────────────────────────────────────────────────────────

export async function removeFriend(friendId: string): Promise<ActionResult> {
  try {
    const userId = await getCurrentUserId();
    await svcRemove(userId, friendId);
    revalidatePath("/social");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to remove friend." };
  }
}

// ─── Privacy settings ───────────────────────────────────────────────────────

const PrivacySchema = z.object({
  shareWeight:  z.boolean().optional(),
  shareBodyFat: z.boolean().optional(),
  sharePRs:     z.boolean().optional(),
});

export async function updatePrivacySettings(data: unknown): Promise<ActionResult> {
  try {
    const userId = await getCurrentUserId();
    const parsed = PrivacySchema.safeParse(data);
    if (!parsed.success) return { success: false, error: "Invalid input." };
    await svcUpdatePrivacy(userId, parsed.data);
    revalidatePath("/social");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update privacy settings." };
  }
}

const OverrideSchema = z.object({
  shareWeight:  z.boolean().nullable().optional(),
  shareBodyFat: z.boolean().nullable().optional(),
  sharePRs:     z.boolean().nullable().optional(),
});

export async function upsertFriendPrivacyOverride(
  friendId: string,
  data: unknown
): Promise<ActionResult> {
  try {
    const userId = await getCurrentUserId();
    const parsed = OverrideSchema.safeParse(data);
    if (!parsed.success) return { success: false, error: "Invalid input." };
    await svcUpsertOverride(userId, friendId, parsed.data);
    revalidatePath(`/social`);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update override." };
  }
}

// ─── Social page data ────────────────────────────────────────────────────────

export async function getSocialPageData(): Promise<
  ActionResult<{
    friends: Awaited<ReturnType<typeof getFriends>>;
    pendingReceived: Awaited<ReturnType<typeof getPendingReceived>>;
    pendingSent: Awaited<ReturnType<typeof getPendingSent>>;
    privacy: Awaited<ReturnType<typeof getPrivacySettings>>;
  }>
> {
  try {
    const userId = await getCurrentUserId();
    const [friends, pendingReceived, pendingSent, privacy] = await Promise.all([
      getFriends(userId),
      getPendingReceived(userId),
      getPendingSent(userId),
      getPrivacySettings(userId),
    ]);
    return { success: true, data: { friends, pendingReceived, pendingSent, privacy } };
  } catch {
    return { success: false, error: "Failed to load social data." };
  }
}

// ─── Friend profile ──────────────────────────────────────────────────────────

export async function getFriendProfile(friendUsername: string): Promise<ActionResult<FriendProfileData>> {
  try {
    const userId = await getCurrentUserId();
    const friend = await prisma.user.findUnique({
      where: { username: friendUsername },
      select: { id: true },
    });
    if (!friend) return { success: false, error: "User not found." };
    const data = await svcGetProfile(userId, friend.id);
    if (!data) return { success: false, error: "Not friends or user not found." };
    return { success: true, data };
  } catch {
    return { success: false, error: "Failed to load profile." };
  }
}

export async function getFriendOverride(friendId: string): Promise<ActionResult<{ shareWeight: boolean | null; shareBodyFat: boolean | null; sharePRs: boolean | null } | null>> {
  try {
    const userId = await getCurrentUserId();
    const override = await getFriendPrivacyOverride(userId, friendId);
    return { success: true, data: override };
  } catch {
    return { success: false, error: "Failed to load override." };
  }
}
