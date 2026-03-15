import { prisma } from "@/lib/prisma";
import { getStreakData } from "@/lib/services/plannerService";
import { getPersonalRecords } from "@/lib/services/reportService";
import { getLatestBodyMetric } from "@/lib/services/metricsService";
import type { FriendSummary, FriendProfileData } from "@/types";

const MILESTONES = [10, 30, 50, 75, 100];

// ─── Privacy helpers ────────────────────────────────────────────────────────

async function getOrCreatePrivacySettings(userId: string) {
  return prisma.userPrivacySettings.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}

export async function resolveFriendVisibility(
  viewerId: string,
  friendId: string
): Promise<{ canSeeWeight: boolean; canSeeBodyFat: boolean; canSeePRs: boolean }> {
  const [viewerSettings, friendSettings, viewerOverride, friendOverride] = await Promise.all([
    getOrCreatePrivacySettings(viewerId),
    getOrCreatePrivacySettings(friendId),
    prisma.friendPrivacyOverride.findUnique({ where: { userId_friendId: { userId: viewerId, friendId } } }),
    prisma.friendPrivacyOverride.findUnique({ where: { userId_friendId: { userId: friendId, friendId: viewerId } } }),
  ]);

  // Viewer's willingness (own override for this friend, else global)
  const iWantWeight  = viewerOverride?.shareWeight  ?? viewerSettings.shareWeight;
  const iWantBF      = viewerOverride?.shareBodyFat ?? viewerSettings.shareBodyFat;
  const iWantPRs     = viewerOverride?.sharePRs     ?? viewerSettings.sharePRs;

  // Friend's willingness to share with viewer
  const friendSharesWeight = friendOverride?.shareWeight  ?? friendSettings.shareWeight;
  const friendSharesBF     = friendOverride?.shareBodyFat ?? friendSettings.shareBodyFat;
  const friendSharesPRs    = friendOverride?.sharePRs     ?? friendSettings.sharePRs;

  return {
    canSeeWeight:  iWantWeight && friendSharesWeight,
    canSeeBodyFat: iWantBF    && friendSharesBF,
    canSeePRs:     iWantPRs   && friendSharesPRs,
  };
}

// ─── Friend requests ────────────────────────────────────────────────────────

export async function sendFriendRequest(
  senderId: string,
  usernameOrEmail: string
): Promise<{ success: boolean; error?: string }> {
  const target = await prisma.user.findFirst({
    where: {
      OR: [
        { username: usernameOrEmail },
        { email: usernameOrEmail },
      ],
    },
    select: { id: true },
  });

  if (!target) return { success: false, error: "User not found." };
  if (target.id === senderId) return { success: false, error: "You can't add yourself." };

  // Check existing friendship in either direction
  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { senderId, receiverId: target.id },
        { senderId: target.id, receiverId: senderId },
      ],
    },
  });

  if (existing) {
    if (existing.status === "ACCEPTED") return { success: false, error: "Already friends." };
    if (existing.status === "PENDING") return { success: false, error: "Request already sent." };
    // DECLINED — allow re-sending by deleting and recreating
    await prisma.friendship.delete({ where: { id: existing.id } });
  }

  await prisma.friendship.create({ data: { senderId, receiverId: target.id } });
  return { success: true };
}

export async function acceptFriendRequest(userId: string, friendshipId: string) {
  await prisma.friendship.update({
    where: { id: friendshipId, receiverId: userId, status: "PENDING" },
    data: { status: "ACCEPTED" },
  });
}

export async function declineFriendRequest(userId: string, friendshipId: string) {
  await prisma.friendship.update({
    where: { id: friendshipId, receiverId: userId, status: "PENDING" },
    data: { status: "DECLINED" },
  });
}

export async function removeFriend(userId: string, friendId: string) {
  await prisma.friendship.deleteMany({
    where: {
      OR: [
        { senderId: userId, receiverId: friendId },
        { senderId: friendId, receiverId: userId },
      ],
      status: "ACCEPTED",
    },
  });
  // Clean up privacy overrides for this pair
  await prisma.friendPrivacyOverride.deleteMany({
    where: {
      OR: [
        { userId, friendId },
        { userId: friendId, friendId: userId },
      ],
    },
  });
}

// ─── Friend queries ─────────────────────────────────────────────────────────

function pickFriend(row: {
  id: string;
  senderId: string;
  receiverId: string;
  sender: { id: string; username: string | null; name: string | null; image: string | null; profileImageBase64: string | null };
  receiver: { id: string; username: string | null; name: string | null; image: string | null; profileImageBase64: string | null };
}, userId: string): FriendSummary {
  const friend = row.senderId === userId ? row.receiver : row.sender;
  return {
    friendshipId: row.id,
    userId: friend.id,
    username: friend.username,
    name: friend.name,
    image: friend.image,
    profileImageBase64: friend.profileImageBase64,
  };
}

const userSelect = {
  id: true,
  username: true,
  name: true,
  image: true,
  profileImageBase64: true,
};

export async function getFriends(userId: string): Promise<FriendSummary[]> {
  const rows = await prisma.friendship.findMany({
    where: {
      OR: [{ senderId: userId }, { receiverId: userId }],
      status: "ACCEPTED",
    },
    include: { sender: { select: userSelect }, receiver: { select: userSelect } },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map((r) => pickFriend(r, userId));
}

export async function getPendingReceived(userId: string) {
  return prisma.friendship.findMany({
    where: { receiverId: userId, status: "PENDING" },
    include: { sender: { select: userSelect } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPendingSent(userId: string) {
  return prisma.friendship.findMany({
    where: { senderId: userId, status: "PENDING" },
    include: { receiver: { select: userSelect } },
    orderBy: { createdAt: "desc" },
  });
}

// ─── Privacy settings ───────────────────────────────────────────────────────

export async function getPrivacySettings(userId: string) {
  return getOrCreatePrivacySettings(userId);
}

export async function updatePrivacySettings(
  userId: string,
  patch: { shareWeight?: boolean; shareBodyFat?: boolean; sharePRs?: boolean }
) {
  return prisma.userPrivacySettings.upsert({
    where: { userId },
    create: { userId, ...patch },
    update: patch,
  });
}

export async function getFriendPrivacyOverride(userId: string, friendId: string) {
  return prisma.friendPrivacyOverride.findUnique({
    where: { userId_friendId: { userId, friendId } },
  });
}

export async function upsertFriendPrivacyOverride(
  userId: string,
  friendId: string,
  patch: { shareWeight?: boolean | null; shareBodyFat?: boolean | null; sharePRs?: boolean | null }
) {
  return prisma.friendPrivacyOverride.upsert({
    where: { userId_friendId: { userId, friendId } },
    create: { userId, friendId, ...patch },
    update: patch,
  });
}

// ─── Friend profile ─────────────────────────────────────────────────────────

export async function getFriendProfileData(
  viewerId: string,
  friendId: string
): Promise<FriendProfileData | null> {
  // Verify accepted friendship
  const friendship = await prisma.friendship.findFirst({
    where: {
      OR: [
        { senderId: viewerId, receiverId: friendId },
        { senderId: friendId, receiverId: viewerId },
      ],
      status: "ACCEPTED",
    },
  });
  if (!friendship) return null;

  const friendUser = await prisma.user.findUnique({
    where: { id: friendId },
    select: { username: true, name: true, image: true, profileImageBase64: true },
  });
  if (!friendUser) return null;

  const [visibility, streakData, myOverrideRow] = await Promise.all([
    resolveFriendVisibility(viewerId, friendId),
    getStreakData(friendId),
    getFriendPrivacyOverride(viewerId, friendId),
  ]);

  const [metrics, prs] = await Promise.all([
    visibility.canSeeWeight || visibility.canSeeBodyFat ? getLatestBodyMetric(friendId) : null,
    visibility.canSeePRs ? getPersonalRecords(friendId) : [],
  ]);

  const milestonesUnlocked = MILESTONES.filter((m) => streakData.bestStreak >= m);

  return {
    username: friendUser.username ?? friendUser.name ?? friendId,
    name: friendUser.name,
    image: friendUser.profileImageBase64 ?? friendUser.image,
    generalStreak: streakData.generalStreak,
    bestStreak: streakData.bestStreak,
    milestonesUnlocked,
    totalWorkoutsThisMonth: streakData.totalWorkoutsThisMonth,
    weight: visibility.canSeeWeight && metrics?.weightKg ? Number(metrics.weightKg) : null,
    bodyFatPct: visibility.canSeeBodyFat && metrics?.bodyFatPct ? Number(metrics.bodyFatPct) : null,
    prs: visibility.canSeePRs ? prs : [],
    visibility,
    myOverride: {
      shareWeight:  myOverrideRow?.shareWeight  ?? null,
      shareBodyFat: myOverrideRow?.shareBodyFat ?? null,
      sharePRs:     myOverrideRow?.sharePRs     ?? null,
    },
  };
}
