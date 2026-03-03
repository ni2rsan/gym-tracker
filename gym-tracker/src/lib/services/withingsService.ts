/**
 * Withings sync service
 *
 * syncWithingsIfNeeded(userId):
 *   - Checks if the user has an active Withings connection
 *   - Refreshes the access token if it's about to expire
 *   - Fetches new measurements from Withings since the last sync
 *   - Deduplicates via withingsMeasureGrpId
 *   - Creates BodyMetricEntry rows (append-only)
 *   - Updates lastSyncAt
 */

import { prisma } from "@/lib/prisma";
import { refreshAccessToken, fetchMeasures } from "@/lib/withings";

const TOKEN_REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // refresh if expiring within 5 min

export async function syncWithingsIfNeeded(userId: string): Promise<void> {
  const connection = await prisma.withingsConnection.findUnique({
    where: { userId },
  });

  if (!connection || !connection.isActive) return;

  let { accessToken, refreshToken, expiresAt } = connection;

  // Refresh token if expiring soon
  if (expiresAt.getTime() - Date.now() < TOKEN_REFRESH_THRESHOLD_MS) {
    try {
      const refreshed = await refreshAccessToken(refreshToken);
      await prisma.withingsConnection.update({
        where: { userId },
        data: {
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken,
          expiresAt: refreshed.expiresAt,
        },
      });
      accessToken = refreshed.accessToken;
      refreshToken = refreshed.refreshToken;
    } catch (err) {
      console.error("Withings token refresh failed:", err);
      // Mark connection inactive so we stop retrying
      await prisma.withingsConnection.update({
        where: { userId },
        data: { isActive: false },
      });
      return;
    }
  }

  // Determine lastupdate: either last sync time or 0 (defaults to 90 days in withings.ts)
  const lastUpdateUnix = connection.lastSyncAt
    ? Math.floor(connection.lastSyncAt.getTime() / 1000)
    : 0;

  let groups;
  try {
    groups = await fetchMeasures(accessToken, lastUpdateUnix);
  } catch (err) {
    console.error("Withings fetch measures failed:", err);
    return;
  }

  if (groups.length === 0) {
    // No new data — just update lastSyncAt
    await prisma.withingsConnection.update({
      where: { userId },
      data: { lastSyncAt: new Date() },
    });
    return;
  }

  // Find grpids already imported for this user to avoid duplicates
  const existingGrpIds = await prisma.bodyMetricEntry
    .findMany({
      where: { userId, withingsMeasureGrpId: { not: null } },
      select: { withingsMeasureGrpId: true },
    })
    .then((rows) => new Set(rows.map((r) => r.withingsMeasureGrpId)));

  const newGroups = groups.filter((g) => !existingGrpIds.has(g.grpid));

  if (newGroups.length > 0) {
    await prisma.bodyMetricEntry.createMany({
      data: newGroups.map((g) => ({
        userId,
        weightKg: g.weightKg,
        bodyFatPct: g.bodyFatPct,
        recordedAt: new Date(g.date * 1000),
        source: "withings",
        withingsMeasureGrpId: g.grpid,
      })),
    });
  }

  await prisma.withingsConnection.update({
    where: { userId },
    data: { lastSyncAt: new Date() },
  });
}

export async function getWithingsConnection(userId: string) {
  return prisma.withingsConnection.findUnique({
    where: { userId },
    select: { isActive: true, connectedAt: true, lastSyncAt: true },
  });
}

export async function storeWithingsConnection(
  userId: string,
  tokens: { accessToken: string; refreshToken: string; expiresAt: Date }
) {
  return prisma.withingsConnection.upsert({
    where: { userId },
    update: {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      isActive: true,
      connectedAt: new Date(),
      lastSyncAt: null, // reset so first sync fetches 90 days of history
    },
    create: {
      userId,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      isActive: true,
    },
  });
}

export async function deactivateWithingsConnection(userId: string) {
  return prisma.withingsConnection.updateMany({
    where: { userId },
    data: { isActive: false },
  });
}
