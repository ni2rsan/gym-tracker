import { getCurrentUserId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { ProfileClient } from "@/components/profile/ProfileClient";
import { UserCircle } from "lucide-react";

export const metadata = { title: "Profile — Gym Tracker" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
          <UserCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Profile</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Your personal information
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
        <ProfileClient
          initialUsername={user?.username ?? null}
          initialHeightCm={user?.heightCm ?? null}
          initialImageBase64={user?.profileImageBase64 ?? null}
          oauthImage={user?.image ?? null}
          displayName={user?.name ?? null}
          email={user?.email ?? null}
        />
      </div>
    </div>
  );
}
