"use client";

import dynamic from "next/dynamic";
import type { FriendProfileData } from "@/core/types/social";

const FriendProfileView = dynamic(
  () => import("./FriendProfileView").then((m) => m.FriendProfileView),
  {
    ssr: false,
    loading: () => (
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 h-64 animate-pulse" />
    ),
  },
);

interface Props {
  data: FriendProfileData;
  friendId: string;
  globalPrivacy: { shareWeight: boolean; shareBodyFat: boolean; sharePRs: boolean };
}

export function FriendProfileViewLazy({ data, friendId, globalPrivacy }: Props) {
  return <FriendProfileView data={data} friendId={friendId} globalPrivacy={globalPrivacy} />;
}
