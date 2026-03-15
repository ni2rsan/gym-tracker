"use client";

import { useTransition } from "react";
import { Check, X } from "lucide-react";
import { acceptFriendRequest, declineFriendRequest } from "@/actions/social";

interface Props {
  friendshipId: string;
  sender: {
    id: string;
    username: string | null;
    name: string | null;
    image: string | null;
    profileImageBase64: string | null;
  };
}

export function FriendRequestCard({ friendshipId, sender }: Props) {
  const [isPending, startTransition] = useTransition();

  const displayName = sender.username ? `@${sender.username}` : (sender.name ?? "Unknown");
  const avatar = sender.profileImageBase64 ?? sender.image;

  const handle = (action: "accept" | "decline") => {
    startTransition(async () => {
      if (action === "accept") await acceptFriendRequest(friendshipId);
      else await declineFriendRequest(friendshipId);
    });
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3">
      {avatar ? (
        <img src={avatar} alt={displayName} className="h-9 w-9 rounded-full object-cover flex-shrink-0" />
      ) : (
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-sm font-bold flex-shrink-0">
          {(sender.username?.[0] ?? sender.name?.[0] ?? "?").toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{displayName}</p>
        {sender.username && sender.name && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{sender.name}</p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => handle("accept")}
          disabled={isPending}
          className="flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-50 transition-colors"
        >
          <Check className="h-3.5 w-3.5" />
          Accept
        </button>
        <button
          onClick={() => handle("decline")}
          disabled={isPending}
          className="flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
          Decline
        </button>
      </div>
    </div>
  );
}
