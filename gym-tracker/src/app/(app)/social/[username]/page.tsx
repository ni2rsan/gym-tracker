import { notFound } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { getFriendProfileData, getPrivacySettings } from "@/lib/services/socialService";
import { prisma } from "@/lib/prisma";
import { FriendProfileView } from "@/components/social/FriendProfileView";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { username } = await params;
  return { title: `${username} — Gym Tracker` };
}

export default async function FriendProfilePage({ params }: Props) {
  const { username } = await params;
  const viewerId = await getCurrentUserId();

  // Support both username and userId in the URL param
  const friend = await prisma.user.findFirst({
    where: { OR: [{ username }, { id: username }] },
    select: { id: true },
  });

  if (!friend) notFound();

  const [profileData, myPrivacy] = await Promise.all([
    getFriendProfileData(viewerId, friend.id),
    getPrivacySettings(viewerId),
  ]);

  if (!profileData) notFound();

  return (
    <div className="max-w-lg mx-auto">
      <FriendProfileView
        data={profileData}
        friendId={friend.id}
        globalPrivacy={myPrivacy}
      />
    </div>
  );
}
