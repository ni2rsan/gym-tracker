import { getCurrentUserId } from "@/lib/auth-helpers";
import {
  getFriendsWithStats,
  getFriendsFeed,
  getPendingReceived,
  getPendingSent,
  getPrivacySettings,
  getOrCreateInviteToken,
  getNewFistBumpsForUser,
  getSocialStats,
} from "@/lib/services/socialService";
import { SocialPageClient } from "@/components/social/SocialPageClient";

export const metadata = { title: "Social — Gym Tracker" };
export const dynamic = "force-dynamic";

export default async function SocialPage() {
  const userId = await getCurrentUserId();

  const [friendsWithStats, feed, pendingReceived, pendingSent, privacy, inviteToken, newFistBumps, socialStats] = await Promise.all([
    getFriendsWithStats(userId),
    getFriendsFeed(userId),
    getPendingReceived(userId),
    getPendingSent(userId),
    getPrivacySettings(userId),
    getOrCreateInviteToken(userId),
    getNewFistBumpsForUser(userId),
    getSocialStats(userId),
  ]);

  return (
    <SocialPageClient
      friendsWithStats={friendsWithStats}
      feed={feed}
      pendingReceived={pendingReceived}
      pendingSent={pendingSent}
      privacy={privacy}
      inviteToken={inviteToken}
      newFistBumps={newFistBumps}
      socialStats={socialStats}
    />
  );
}
