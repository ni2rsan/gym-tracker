"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserPlus, ArrowLeft, Flame, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { AddFriendForm } from "@/components/social/AddFriendForm";
import { FriendRequestCard } from "@/components/social/FriendRequestCard";
import { GlobalPrivacySettings } from "@/components/social/GlobalPrivacySettings";
import { removeFriend, upsertFriendPrivacyOverride } from "@/actions/social";
import { Toast } from "@/components/ui/Toast";
import type { FriendProfileData } from "@/types";

const MILESTONE_EMOJI: Record<number, string> = {
  10: "🥉", 30: "🥈", 50: "🥇", 75: "💎", 100: "👑",
};

type FriendStat = FriendProfileData & { userId: string };

type PendingRequest = {
  id: string;
  sender: {
    id: string;
    username: string | null;
    name: string | null;
    image: string | null;
    profileImageBase64: string | null;
  };
};

type PendingSent = {
  id: string;
  receiver: {
    id: string;
    username: string | null;
    name: string | null;
    image: string | null;
    profileImageBase64: string | null;
  };
};

interface Props {
  friendsWithStats: FriendStat[];
  pendingReceived: PendingRequest[];
  pendingSent: PendingSent[];
  privacy: { shareWeight: boolean; shareBodyFat: boolean; sharePRs: boolean };
}

// ─── Friend stat card (feed view) ───────────────────────────────────────────

function FriendStatCard({ data }: { data: FriendStat }) {
  const href = `/social/${data.username ?? data.userId}`;
  const displayName = data.name ?? data.username ?? "Unknown";
  const topMilestone = [...data.milestonesUnlocked].sort((a, b) => b - a)[0];

  return (
    <Link href={href} className="block rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors">
      <div className="flex items-center gap-3 mb-3">
        {data.image ? (
          <img src={data.image} alt={displayName} className="h-10 w-10 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-sm font-bold flex-shrink-0">
            {(data.username?.[0] ?? data.name?.[0] ?? "?").toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">{displayName}</p>
          {data.username && data.name && (
            <p className="text-xs text-zinc-400 truncate">@{data.username}</p>
          )}
        </div>
        {topMilestone != null && (
          <span className="text-xl flex-shrink-0">{MILESTONE_EMOJI[topMilestone]}</span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="flex items-center justify-center gap-1">
            <Flame className="h-3.5 w-3.5 text-orange-500" />
            <p className="text-base font-bold text-zinc-900 dark:text-white">{data.generalStreak}</p>
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">Streak</p>
        </div>
        <div>
          <p className="text-base font-bold text-zinc-900 dark:text-white">{data.bestStreak}</p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">Best</p>
        </div>
        <div>
          <p className="text-base font-bold text-zinc-900 dark:text-white">{data.totalWorkoutsThisMonth}</p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">This month</p>
        </div>
      </div>

      {(data.weight != null || data.bodyFatPct != null) && (
        <div className="flex gap-3 mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          {data.weight != null && (
            <div className="flex-1 text-center">
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                {data.weight.toFixed(1)}<span className="text-xs font-normal text-zinc-400 ml-0.5">kg</span>
              </p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">Weight</p>
            </div>
          )}
          {data.bodyFatPct != null && (
            <div className="flex-1 text-center">
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                {data.bodyFatPct.toFixed(1)}<span className="text-xs font-normal text-zinc-400">%</span>
              </p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">Body Fat</p>
            </div>
          )}
        </div>
      )}

      {data.prs.length > 0 && (() => {
        const top = data.prs[0];
        return (
          <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-1">Top PR</p>
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">{top.exerciseName}</p>
              <p className="text-xs font-semibold text-zinc-900 dark:text-white ml-2 flex-shrink-0">
                {top.maxWeightKg != null
                  ? `${top.maxWeightKg} kg${top.repsAtMaxWeight != null ? ` × ${top.repsAtMaxWeight}` : ""}`
                  : top.maxReps != null ? `${top.maxReps} reps` : ""}
              </p>
            </div>
          </div>
        );
      })()}
    </Link>
  );
}

// ─── Friend manage row (manage view) ────────────────────────────────────────

type Override = { shareWeight: boolean | null; shareBodyFat: boolean | null; sharePRs: boolean | null };

function FriendManageRow({
  friend,
  globalPrivacy,
  onRemoved,
}: {
  friend: FriendStat;
  globalPrivacy: { shareWeight: boolean; shareBodyFat: boolean; sharePRs: boolean };
  onRemoved: (userId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [overrides, setOverrides] = useState<Override>(friend.myOverride);
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const displayName = friend.name ?? friend.username ?? "Unknown";
  const avatar = friend.image;

  const effective = (key: keyof typeof globalPrivacy) =>
    overrides[key] ?? globalPrivacy[key];

  const toggleOverride = (key: keyof Override) => {
    const current = overrides[key];
    const globalVal = globalPrivacy[key as keyof typeof globalPrivacy];
    const next = current === null ? !globalVal : !current;
    const patch = { ...overrides, [key]: next };
    setOverrides(patch);
    startTransition(async () => {
      const result = await upsertFriendPrivacyOverride(friend.userId, patch);
      if (!result.success) {
        setOverrides(overrides);
        setToast({ message: result.error ?? "Failed to save.", type: "error" });
      }
    });
  };

  const resetOverride = (key: keyof Override) => {
    const patch = { ...overrides, [key]: null };
    setOverrides(patch);
    startTransition(async () => {
      const result = await upsertFriendPrivacyOverride(friend.userId, patch);
      if (!result.success) {
        setOverrides(overrides);
        setToast({ message: result.error ?? "Failed to save.", type: "error" });
      }
    });
  };

  const handleRemove = () => {
    startTransition(async () => {
      await removeFriend(friend.userId);
      onRemoved(friend.userId);
    });
  };

  const FIELDS: { key: keyof Override; label: string }[] = [
    { key: "shareWeight", label: "Weight" },
    { key: "shareBodyFat", label: "Body Fat %" },
    { key: "sharePRs", label: "Personal Records" },
  ];

  return (
    <>
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        {/* Row header */}
        <div className="flex items-center gap-3 px-4 py-3">
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
              <p className="text-xs text-zinc-400 truncate">@{friend.username}</p>
            )}
          </div>

          {/* Sharing summary pills */}
          <div className="hidden sm:flex items-center gap-1 mr-1">
            {FIELDS.map(({ key, label }) => (
              <span
                key={key}
                className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                  effective(key as keyof typeof globalPrivacy)
                    ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 line-through"
                }`}
              >
                {label}
              </span>
            ))}
          </div>

          {confirming ? (
            <div className="flex items-center gap-2 flex-shrink-0">
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
            </div>
          ) : (
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => setConfirming(true)}
                className="flex items-center justify-center h-7 w-7 rounded-lg text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
                title="Remove friend"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setExpanded((v) => !v)}
                className="flex items-center justify-center h-7 w-7 rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="Privacy settings"
              >
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
          )}
        </div>

        {/* Expanded privacy overrides */}
        {expanded && (
          <div className="border-t border-zinc-100 dark:border-zinc-800 px-4 pb-3 pt-2 space-y-1">
            <p className="text-xs text-zinc-400 dark:text-zinc-500 pb-1">
              What you share with {displayName}. Defaults follow your global settings.
            </p>
            {FIELDS.map(({ key, label }) => {
              const isOverridden = overrides[key] !== null;
              const on = effective(key as keyof typeof globalPrivacy);
              return (
                <div key={key} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">{label}</span>
                    {isOverridden && (
                      <button
                        onClick={() => resetOverride(key)}
                        disabled={isPending}
                        className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 underline underline-offset-2 disabled:opacity-50 transition-colors"
                      >
                        Reset to global
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => toggleOverride(key)}
                    disabled={isPending}
                    className={`flex h-6 w-11 items-center rounded-full px-0.5 transition-colors disabled:opacity-50 ${
                      on ? "bg-emerald-500 justify-end" : "bg-zinc-200 dark:bg-zinc-700 justify-start"
                    }`}
                  >
                    <div className="h-5 w-5 rounded-full bg-white shadow" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function SocialPageClient({ friendsWithStats, pendingReceived, pendingSent, privacy }: Props) {
  const [view, setView] = useState<"feed" | "manage">("feed");
  const [friends, setFriends] = useState(friendsWithStats);
  const router = useRouter();

  const handleFriendRemoved = (userId: string) => {
    setFriends((prev) => prev.filter((f) => f.userId !== userId));
    router.refresh();
  };

  if (view === "manage") {
    return (
      <div className="space-y-6">
        {/* Manage header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setView("feed")}
            className="flex items-center justify-center h-8 w-8 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Manage Friends</h1>
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
                <FriendRequestCard key={req.id} friendshipId={req.id} sender={req.sender} />
              ))}
            </div>
          </div>
        )}

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

        {/* Friends with per-friend privacy */}
        {friends.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white px-0.5">
              Friends <span className="ml-1 font-normal text-zinc-400">{friends.length}</span>
            </h2>
            <div className="space-y-2">
              {friends.map((f) => (
                <FriendManageRow
                  key={f.userId}
                  friend={f}
                  globalPrivacy={privacy}
                  onRemoved={handleFriendRemoved}
                />
              ))}
            </div>
          </div>
        )}

        {/* Global privacy defaults */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white px-0.5">Global Defaults</h2>
          <GlobalPrivacySettings initial={privacy} />
        </div>
      </div>
    );
  }

  // Feed view
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Social</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Your friends&apos; progress.</p>
        </div>
        <button
          onClick={() => setView("manage")}
          className="relative flex items-center justify-center h-9 w-9 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors"
          title="Add friends / manage"
        >
          <UserPlus className="h-4 w-4" />
          {pendingReceived.length > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white text-[10px] font-bold">
              {pendingReceived.length}
            </span>
          )}
        </button>
      </div>

      {friends.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 p-10 text-center">
          <UserPlus className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">No friends yet</p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
            Tap the{" "}
            <button onClick={() => setView("manage")} className="underline underline-offset-2 hover:text-zinc-600 dark:hover:text-zinc-300">
              icon above
            </button>{" "}
            to add friends.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {friends.map((f) => (
            <FriendStatCard key={f.userId} data={f} />
          ))}
        </div>
      )}
    </div>
  );
}
