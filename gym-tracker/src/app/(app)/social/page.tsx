import { getCurrentUserId } from "@/lib/auth-helpers";
import {
  getFriendsWithStats,
  getPendingReceived,
  getPendingSent,
  getPrivacySettings,
} from "@/lib/services/socialService";
import { SocialPageClient } from "@/components/social/SocialPageClient";

export const metadata = { title: "Social — Gym Tracker" };
export const dynamic = "force-dynamic";

export default async function SocialPage() {
  const userId = await getCurrentUserId();

  const [friendsWithStats, pendingReceived, pendingSent, privacy] = await Promise.all([
    getFriendsWithStats(userId),
    getPendingReceived(userId),
    getPendingSent(userId),
    getPrivacySettings(userId),
  ]);

  return (
    <SocialPageClient
      friendsWithStats={friendsWithStats}
      pendingReceived={pendingReceived}
      pendingSent={pendingSent}
      privacy={privacy}
    />
  );
}
