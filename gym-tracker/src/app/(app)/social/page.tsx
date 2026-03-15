import { Suspense } from "react";
import { getCurrentUserId } from "@/lib/auth-helpers";
import {
  getFriends,
  getPendingReceived,
  getPendingSent,
  getPrivacySettings,
} from "@/lib/services/socialService";
import { AddFriendForm } from "@/components/social/AddFriendForm";
import { FriendRequestCard } from "@/components/social/FriendRequestCard";
import { FriendCard } from "@/components/social/FriendCard";
import { GlobalPrivacySettings } from "@/components/social/GlobalPrivacySettings";

export const metadata = { title: "Social — Gym Tracker" };
export const dynamic = "force-dynamic";

export default async function SocialPage() {
  const userId = await getCurrentUserId();

  const [friends, pendingReceived, pendingSent, privacy] = await Promise.all([
    getFriends(userId),
    getPendingReceived(userId),
    getPendingSent(userId),
    getPrivacySettings(userId),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Social</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
          Connect with friends and share your progress.
        </p>
      </div>

      {/* Add friend */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-white mb-3">Add a Friend</h2>
        <AddFriendForm />
      </div>

      {/* Incoming requests */}
      {pendingReceived.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white px-0.5">
            Friend Requests{" "}
            <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium px-2 py-0.5">
              {pendingReceived.length}
            </span>
          </h2>
          <div className="space-y-2">
            {pendingReceived.map((req) => (
              <FriendRequestCard
                key={req.id}
                friendshipId={req.id}
                sender={req.sender}
              />
            ))}
          </div>
        </div>
      )}

      {/* Friends list */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-white px-0.5">
          Friends
          {friends.length > 0 && (
            <span className="ml-1.5 text-zinc-400 font-normal">{friends.length}</span>
          )}
        </h2>
        {friends.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 p-8 text-center">
            <p className="text-sm text-zinc-400 dark:text-zinc-500">No friends yet. Add someone above!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {friends.map((friend) => (
              <FriendCard key={friend.friendshipId} friend={friend} />
            ))}
          </div>
        )}
      </div>

      {/* Outgoing pending */}
      {pendingSent.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 px-0.5">Sent Requests</h2>
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800">
            {pendingSent.map((req) => {
              const r = req.receiver;
              return (
                <div key={req.id} className="flex items-center gap-3 px-4 py-3">
                  {r.image ? (
                    <img src={r.image} alt={r.name ?? r.username ?? ""} className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-sm font-bold">
                      {(r.username?.[0] ?? r.name?.[0] ?? "?").toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                      {r.name ?? r.username ?? "Unknown"}
                    </p>
                    {r.username && r.name && (
                      <p className="text-xs text-zinc-400 truncate">@{r.username}</p>
                    )}
                  </div>
                  <span className="text-xs text-zinc-400 dark:text-zinc-500">Pending</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Global privacy */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-white px-0.5">Privacy Settings</h2>
        <GlobalPrivacySettings initial={privacy} />
      </div>
    </div>
  );
}
