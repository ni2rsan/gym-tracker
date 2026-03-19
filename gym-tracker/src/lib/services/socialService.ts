import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { getStreakData } from "@/lib/services/plannerService";
import { getPersonalRecords } from "@/lib/services/reportService";
import { getLatestBodyMetric } from "@/lib/services/metricsService";
import type { FriendSummary, FriendProfileData, WorkoutFeedEntry, NewFistBumpNotification, SocialStats } from "@/types";

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
  const [friendSettings, friendOverride] = await Promise.all([
    getOrCreatePrivacySettings(friendId),
    prisma.friendPrivacyOverride.findUnique({ where: { userId_friendId: { userId: friendId, friendId: viewerId } } }),
  ]);

  // Visibility is determined solely by what the friend chooses to share
  return {
    canSeeWeight:  friendOverride?.shareWeight  ?? friendSettings.shareWeight,
    canSeeBodyFat: friendOverride?.shareBodyFat ?? friendSettings.shareBodyFat,
    canSeePRs:     friendOverride?.sharePRs     ?? friendSettings.sharePRs,
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

// ─── Friends with stats (batch) ─────────────────────────────────────────────

export async function getFriendsWithStats(
  userId: string
): Promise<Array<FriendProfileData & { userId: string }>> {
  const friends = await getFriends(userId);
  if (friends.length === 0) return [];
  const profiles = await Promise.all(
    friends.map((f) => getFriendProfileData(userId, f.userId))
  );
  return profiles
    .map((p, i) => (p ? { ...p, userId: friends[i].userId } : null))
    .filter((p): p is FriendProfileData & { userId: string } => p !== null);
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
    select: { username: true, name: true, image: true, profileImageBase64: true, heightCm: true },
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
    heightCm: friendUser.heightCm ?? null,
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

// ─── Fist bumps ──────────────────────────────────────────────────────────────

export async function toggleFistBump(
  userId: string,
  sessionId: string
): Promise<{ fistBumped: boolean }> {
  const existing = await prisma.workoutFistBump.findUnique({
    where: { userId_sessionId: { userId, sessionId } },
  });
  if (existing) {
    await prisma.workoutFistBump.delete({ where: { id: existing.id } });
    return { fistBumped: false };
  } else {
    await prisma.workoutFistBump.create({ data: { userId, sessionId } });
    return { fistBumped: true };
  }
}

// ─── Notification seen tracking ──────────────────────────────────────────────

export async function getSocialBadgeCounts(
  userId: string
): Promise<{ requests: number; feed: number; fistBumps: number }> {
  const seenRow = await prisma.socialNotificationSeen.findUnique({ where: { userId } });
  const lastSeenRequests = seenRow?.lastSeenRequests ?? new Date(0);
  const lastSeenFeed = seenRow?.lastSeenFeed ?? new Date(0);
  const lastSeenFistBumps = seenRow?.lastSeenFistBumps ?? new Date(0);

  const [requests, friendships, fistBumps] = await Promise.all([
    prisma.friendship.count({
      where: { receiverId: userId, status: "PENDING", createdAt: { gt: lastSeenRequests } },
    }),
    prisma.friendship.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
        status: "ACCEPTED",
      },
      select: { senderId: true, receiverId: true },
    }),
    // Fist bumps received on the current user's own sessions
    prisma.workoutFistBump.count({
      where: {
        session: { userId },
        userId: { not: userId }, // exclude self-bumps
        createdAt: { gt: lastSeenFistBumps },
      },
    }),
  ]);

  const friendIds = friendships.map((f) =>
    f.senderId === userId ? f.receiverId : f.senderId
  );

  let feed = 0;
  if (friendIds.length > 0) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const cutoff = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
    feed = await prisma.workoutSession.count({
      where: {
        userId: { in: friendIds },
        date: { gte: cutoff, lt: today },
        createdAt: { gt: lastSeenFeed },
      },
    });
  }

  return { requests, feed, fistBumps };
}

export async function markSocialSeen(
  userId: string,
  section: "requests" | "feed"
): Promise<void> {
  const now = new Date();
  await prisma.socialNotificationSeen.upsert({
    where: { userId },
    create: { userId, lastSeenRequests: now, lastSeenFeed: now, lastSeenFistBumps: now },
    update:
      section === "requests"
        ? { lastSeenRequests: now }
        : { lastSeenFeed: now, lastSeenFistBumps: now }, // viewing feed clears both
  });
}

export async function getNewFistBumpsForUser(userId: string): Promise<NewFistBumpNotification[]> {
  const seen = await prisma.socialNotificationSeen.findUnique({ where: { userId } });
  const lastSeen = seen?.lastSeenFistBumps ?? new Date(0);

  const bumps = await prisma.workoutFistBump.findMany({
    where: {
      session: { userId },   // on the user's own sessions
      userId: { not: userId }, // exclude self-bumps
      createdAt: { gt: lastSeen },
    },
    include: {
      user: { select: { name: true, username: true, image: true, profileImageBase64: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return bumps.map((b) => ({
    sessionId: b.sessionId,
    bumperName: b.user.name,
    bumperUsername: b.user.username,
    bumperImage: b.user.profileImageBase64 ?? b.user.image ?? null,
  }));
}

export async function getSocialStats(userId: string): Promise<SocialStats> {
  const [totalFistBumpsReceived, totalWorkoutsTracked] = await Promise.all([
    prisma.workoutFistBump.count({
      where: { session: { userId }, userId: { not: userId } },
    }),
    prisma.workoutSession.count({ where: { userId } }),
  ]);
  return { totalFistBumpsReceived, totalWorkoutsTracked };
}

// ─── Friends feed ────────────────────────────────────────────────────────────

const WORKOUT_TYPE_LABELS: Record<string, string> = {
  UPPER_BODY: "Upper Body",
  LOWER_BODY: "Lower Body",
  BODYWEIGHT: "Bodyweight",
  FULL_BODY: "Full Body",
  CARDIO: "Cardio",
};

export async function getFriendsFeed(viewerId: string, days = 14): Promise<WorkoutFeedEntry[]> {
  // 1. Get friends
  const friends = await getFriends(viewerId);
  const friendIds = friends.map((f) => f.userId);
  const allUserIds = [viewerId, ...friendIds];

  // 2. Resolve PR visibility for each friend (own = always true)
  const prVisibilityMap = new Map<string, boolean>();
  prVisibilityMap.set(viewerId, true);
  await Promise.all(
    friendIds.map(async (fid) => {
      const vis = await resolveFriendVisibility(viewerId, fid);
      prVisibilityMap.set(fid, vis.canSeePRs);
    })
  );

  // 3. Date range: past N days, before today (completed sessions only)
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const cutoff = new Date(today.getTime() - days * 24 * 60 * 60 * 1000);

  // 4. Fetch sessions with sets + user info
  const sessions = await prisma.workoutSession.findMany({
    where: {
      userId: { in: allUserIds },
      date: { gte: cutoff, lt: today },
    },
    include: {
      sets: {
        select: {
          exerciseId: true,
          weightKg: true,
          exercise: { select: { muscleGroup: true } },
        },
      },
      user: {
        select: { id: true, username: true, name: true, image: true, profileImageBase64: true },
      },
    },
    orderBy: { date: "desc" },
    take: 100,
  });

  if (sessions.length === 0) return [];

  // 5. Fetch planned workouts for workout type labels
  const planned = await prisma.plannedWorkout.findMany({
    where: {
      userId: { in: allUserIds },
      date: { gte: cutoff, lt: today },
    },
    select: { userId: true, date: true, blockType: true },
  });
  const plannedMap = new Map<string, string>();
  for (const pw of planned) {
    const dateStr = pw.date instanceof Date
      ? pw.date.toISOString().split("T")[0]
      : String(pw.date).split("T")[0];
    plannedMap.set(`${pw.userId}:${dateStr}`, pw.blockType);
  }

  // 6. Count PRs per session using raw SQL (for sessions with weighted exercises)
  const sessionIds = sessions
    .filter((s) => s.sets.some((set) => set.weightKg != null))
    .map((s) => s.id);

  const prCountMap = new Map<string, number>();
  if (sessionIds.length > 0) {
    type PrRow = { session_id: string; pr_count: bigint };
    const prRows = await prisma.$queryRaw<PrRow[]>(
      Prisma.sql`
        WITH session_maxes AS (
          SELECT es."sessionId", es."exerciseId", MAX(es."weightKg") AS max_weight
          FROM "ExerciseSet" es
          WHERE es."sessionId" IN (${Prisma.join(sessionIds)})
            AND es."weightKg" IS NOT NULL
          GROUP BY es."sessionId", es."exerciseId"
        )
        SELECT
          sm."sessionId" AS session_id,
          COUNT(*)::bigint AS pr_count
        FROM session_maxes sm
        JOIN "WorkoutSession" ws ON ws.id = sm."sessionId"
        WHERE NOT EXISTS (
          SELECT 1
          FROM "ExerciseSet" es2
          JOIN "WorkoutSession" ws2 ON es2."sessionId" = ws2.id
          WHERE ws2."userId" = ws."userId"
            AND es2."exerciseId" = sm."exerciseId"
            AND ws2.date < ws.date
            AND es2."weightKg" >= sm.max_weight
        )
        GROUP BY sm."sessionId"
      `
    );
    for (const row of prRows) {
      prCountMap.set(row.session_id, Number(row.pr_count));
    }
  }

  // 7. Fetch fist bumps for all sessions
  const allSessionIds = sessions.map((s) => s.id);
  const allFistBumps = await prisma.workoutFistBump.findMany({
    where: { sessionId: { in: allSessionIds } },
    select: {
      sessionId: true,
      userId: true,
      user: { select: { name: true, username: true } },
    },
  });
  const fistBumpMap = new Map<string, { userId: string; name: string | null; username: string | null }[]>();
  for (const bump of allFistBumps) {
    const arr = fistBumpMap.get(bump.sessionId) ?? [];
    arr.push({ userId: bump.userId, name: bump.user.name, username: bump.user.username });
    fistBumpMap.set(bump.sessionId, arr);
  }

  // 8. Build feed entries (skip empty sessions)
  return sessions.filter((s) => s.sets.length > 0).map((session) => {
    const dateStr = session.date instanceof Date
      ? session.date.toISOString().split("T")[0]
      : String(session.date).split("T")[0];

    const plannedType = plannedMap.get(`${session.userId}:${dateStr}`);
    let workoutType: string;
    if (plannedType) {
      workoutType = WORKOUT_TYPE_LABELS[plannedType] ?? "Workout";
    } else {
      // Infer from majority muscle group
      const counts = new Map<string, number>();
      for (const s of session.sets) {
        const mg = s.exercise.muscleGroup;
        counts.set(mg, (counts.get(mg) ?? 0) + 1);
      }
      const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
      workoutType = top ? (WORKOUT_TYPE_LABELS[top[0]] ?? "Workout") : "Workout";
    }

    const exerciseCount = new Set(session.sets.map((s) => s.exerciseId)).size;
    const totalSets = session.sets.length;
    const canSeePRs = prVisibilityMap.get(session.userId) ?? false;
    const rawPrCount = prCountMap.get(session.id) ?? 0;

    return {
      sessionId: session.id,
      userId: session.userId,
      username: session.user.username,
      name: session.user.name,
      image: session.user.profileImageBase64 ?? session.user.image,
      date: dateStr,
      workoutType,
      exerciseCount,
      totalSets,
      prCount: canSeePRs ? rawPrCount : 0,
      isOwnWorkout: session.userId === viewerId,
      fistBumps: fistBumpMap.get(session.id) ?? [],
      myFistBump: (fistBumpMap.get(session.id) ?? []).some((b) => b.userId === viewerId),
    };
  });
}

// ─── Invite links ─────────────────────────────────────────────────────────

export async function getOrCreateInviteToken(userId: string): Promise<string> {
  const existing = await prisma.friendInvite.findUnique({ where: { userId } });
  if (existing) return existing.token;
  const created = await prisma.friendInvite.create({ data: { userId } });
  return created.token;
}

export async function acceptInvite(
  viewerId: string,
  token: string
): Promise<{ ok: boolean; error?: string }> {
  const invite = await prisma.friendInvite.findUnique({
    where: { token },
    select: { userId: true },
  });
  if (!invite) return { ok: false, error: "Invalid invite link." };
  if (invite.userId === viewerId) return { ok: false, error: "self" };

  // Already friends?
  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { senderId: viewerId, receiverId: invite.userId },
        { senderId: invite.userId, receiverId: viewerId },
      ],
    },
  });
  if (existing?.status === "ACCEPTED") return { ok: true }; // already friends, silent

  if (existing) {
    // Pending — just accept it
    await prisma.friendship.update({
      where: { id: existing.id },
      data: { status: "ACCEPTED" },
    });
  } else {
    await prisma.friendship.create({
      data: {
        senderId: invite.userId,
        receiverId: viewerId,
        status: "ACCEPTED",
      },
    });
  }
  return { ok: true };
}
