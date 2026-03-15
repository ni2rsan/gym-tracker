"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { UserMinus, ChevronRight } from "lucide-react";
import { removeFriend } from "@/actions/social";
import type { FriendSummary } from "@/types";

export function FriendCard({ friend }: { friend: FriendSummary }) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  const displayName = friend.username ? `@${friend.username}` : (friend.name ?? "Unknown");
  const avatar = friend.profileImageBase64 ?? friend.image;
  const profileHref = friend.username ? `/social/${friend.username}` : null;

  const handleRemove = () => {
    startTransition(async () => {
      await removeFriend(friend.userId);
      setConfirming(false);
    });
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3">
      {avatar ? (
        <img src={avatar} alt={displayName} className="h-9 w-9 rounded-full object-cover flex-shrink-0" />
      ) : (
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-sm font-bold flex-shrink-0">
          {(friend.username?.[0] ?? friend.name?.[0] ?? "?").toUpperCase()}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{displayName}</p>
        {friend.username && friend.name && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{friend.name}</p>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {confirming ? (
          <>
            <button
              onClick={handleRemove}
              disabled={isPending}
              className="text-xs font-medium text-red-500 hover:text-red-600 disabled:opacity-50 transition-colors"
            >
              Confirm
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            className="flex items-center justify-center h-7 w-7 rounded-lg text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
            title="Remove friend"
          >
            <UserMinus className="h-4 w-4" />
          </button>
        )}

        {profileHref && (
          <Link
            href={profileHref}
            className="flex items-center justify-center h-7 w-7 rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors"
            title="View profile"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  );
}
