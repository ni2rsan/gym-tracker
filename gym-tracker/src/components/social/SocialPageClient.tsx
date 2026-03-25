"use client";

import { useState, useTransition, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, ArrowLeft, Flame, ChevronDown, ChevronUp, Trash2, Trophy, Link2, Check, Users, Dumbbell, X } from "lucide-react";
import { AddFriendForm } from "@/components/social/AddFriendForm";
import { FriendRequestCard } from "@/components/social/FriendRequestCard";
import { GlobalPrivacySettings } from "@/components/social/GlobalPrivacySettings";
import { removeFriend, upsertFriendPrivacyOverride, toggleFistBump, markSocialSeen } from "@/actions/social";
import { FriendProfileView } from "@/components/social/FriendProfileView";
import { Toast } from "@/components/ui/Toast";
import type { FriendProfileData, WorkoutFeedEntry, NewFistBumpNotification, SocialStats } from "@/types";


const CONFETTI_COLORS = ["#f59e0b", "#10b981", "#3b82f6", "#ef4444", "#8b5cf6", "#ec4899", "#f97316", "#14b8a6"];
const CONFETTI_PARTICLES = Array.from({ length: 28 }, (_, i) => {
  const angle = (i / 28) * 2 * Math.PI;
  const dist = 85 + (i % 4) * 22;
  return {
    id: i,
    dx: Math.round(Math.cos(angle) * dist),
    dy: Math.round(Math.sin(angle) * dist),
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    size: 6 + (i % 3) * 2,
    round: i % 3 === 0,
    delay: (i % 7) * 18,
  };
});

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
  feed: WorkoutFeedEntry[];
  pendingReceived: PendingRequest[];
  pendingSent: PendingSent[];
  privacy: { shareWeight: boolean; shareBodyFat: boolean; sharePRs: boolean };
  inviteToken: string;
  newFistBumps: NewFistBumpNotification[];
  newFeedSessionIds: string[];
  socialStats: SocialStats;
}

type FeedFilter = "all" | "me" | "friends";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateAgo(dateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + "T00:00:00");
  const diffMs = today.getTime() - d.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  return `${day}/${month}`;
}

// ─── Feed card ───────────────────────────────────────────────────────────────

function FeedCard({
  entry,
  onFistBump,
  highlightColor,
}: {
  entry: WorkoutFeedEntry;
  onFistBump: (sessionId: string) => void;
  highlightColor?: "amber" | "blue";
}) {
  const displayName = entry.isOwnWorkout
    ? "You"
    : entry.username ?? entry.name ?? "Someone";
  const dateLabel = formatDateAgo(entry.date);
  const bumpCount = entry.fistBumps.length;

  const highlightClass = highlightColor === "amber"
    ? "border-amber-300 dark:border-amber-600 ring-1 ring-amber-200 dark:ring-amber-800"
    : highlightColor === "blue"
    ? "border-blue-300 dark:border-blue-600 ring-1 ring-blue-200 dark:ring-blue-800"
    : "border-zinc-200 dark:border-zinc-800";

  return (
    <div className={`flex gap-3 rounded-2xl border bg-white dark:bg-zinc-900 p-4 transition-colors ${highlightClass}`}>
      {entry.image ? (
        <img src={entry.image} alt={displayName} className="h-9 w-9 rounded-full object-cover flex-shrink-0 mt-0.5" />
      ) : (
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-sm font-bold flex-shrink-0 mt-0.5">
          {(entry.username?.[0] ?? entry.name?.[0] ?? "?").toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
            {displayName}
          </p>
          <span className="text-xs text-zinc-400 dark:text-zinc-500 flex-shrink-0">{dateLabel}</span>
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-0.5">
          logged a{" "}
          <span className="font-medium text-zinc-900 dark:text-white">{entry.workoutType}</span>{" "}
          workout
        </p>
        <div className="flex items-center justify-between mt-1.5">
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              {entry.exerciseCount} exercise{entry.exerciseCount !== 1 ? "s" : ""} · {entry.totalSets} sets
            </span>
            {entry.prCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                <Trophy className="h-3 w-3" />
                {entry.prCount} PR{entry.prCount !== 1 ? "s" : ""}!
              </span>
            )}
          </div>
          {/* Fist bump — only on friends' entries */}
          {!entry.isOwnWorkout && (
            <button
              onClick={() => onFistBump(entry.sessionId)}
              className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors ${
                entry.myFistBump
                  ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                  : "text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
              title={entry.myFistBump ? "Remove fist bump" : "Fist bump!"}
            >
              <img src="/fistbump10.png" alt="" className="h-4 w-4 object-contain fb-icon" />
              {bumpCount > 0 && <span>{bumpCount}</span>}
            </button>
          )}
          {/* Own entry: show bumper names */}
          {entry.isOwnWorkout && bumpCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400 max-w-[160px]">
              <img src="/fistbump10.png" alt="" className="h-3.5 w-3.5 object-contain flex-shrink-0 fb-icon" />
              <span className="truncate">
                {(() => {
                  const names = entry.fistBumps.map((b) => b.username ?? b.name ?? "Someone");
                  if (names.length === 1) return names[0];
                  if (names.length === 2) return `${names[0]} & ${names[1]}`;
                  return `${names[0]} +${names.length - 1}`;
                })()}
              </span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Friend expandable card ──────────────────────────────────────────────────

function FriendExpandableCard({
  data,
  globalPrivacy,
}: {
  data: FriendStat;
  globalPrivacy: { shareWeight: boolean; shareBodyFat: boolean; sharePRs: boolean };
}) {
  const [expanded, setExpanded] = useState(false);
  const displayName = data.username ?? data.name ?? "Unknown";

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full p-4 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
      >
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
            {data.name && data.username && (
              <p className="text-xs text-zinc-400 truncate">{data.name}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {expanded ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
          </div>
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
      </button>

      {expanded && (
        <div className="border-t border-zinc-100 dark:border-zinc-800 p-4">
          <FriendProfileView data={data} friendId={data.userId} globalPrivacy={globalPrivacy} showHeader={false} />
        </div>
      )}
    </div>
  );
}

// ─── Friend manage row ───────────────────────────────────────────────────────

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

  const displayName = friend.username ?? friend.name ?? "Unknown";
  const avatar = friend.image;

  const effective = (key: keyof typeof globalPrivacy) => overrides[key] ?? globalPrivacy[key];

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
            {friend.name && friend.username && (
              <p className="text-xs text-zinc-400 truncate">{friend.name}</p>
            )}
          </div>
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
              <button onClick={handleRemove} disabled={isPending} className="text-xs font-medium text-red-500 hover:text-red-600 disabled:opacity-50 transition-colors">Confirm</button>
              <button onClick={() => setConfirming(false)} className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors">Cancel</button>
            </div>
          ) : (
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={() => setConfirming(true)} className="flex items-center justify-center h-7 w-7 rounded-lg text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors" title="Remove friend">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setExpanded((v) => !v)} className="flex items-center justify-center h-7 w-7 rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" title="Privacy settings">
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
          )}
        </div>
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
                      <button onClick={() => resetOverride(key)} disabled={isPending} className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 underline underline-offset-2 disabled:opacity-50 transition-colors">Reset to global</button>
                    )}
                  </div>
                  <button
                    onClick={() => toggleOverride(key)}
                    disabled={isPending}
                    className={`flex h-6 w-11 items-center rounded-full px-0.5 transition-colors disabled:opacity-50 ${on ? "bg-emerald-500 justify-end" : "bg-zinc-200 dark:bg-zinc-700 justify-start"}`}
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

export function SocialPageClient({ friendsWithStats, feed, pendingReceived, pendingSent, privacy, inviteToken, newFistBumps, newFeedSessionIds, socialStats }: Props) {
  const [view, setView] = useState<"main" | "manage">("main");
  const [tab, setTab] = useState<"feed" | "friends">("friends");
  const [feedFilter, setFeedFilter] = useState<FeedFilter>("all");
  const [friends, setFriends] = useState(friendsWithStats);
  const [pendingState, setPendingState] = useState(pendingReceived);
  const [copied, setCopied] = useState(false);
  const [feedState, setFeedState] = useState<WorkoutFeedEntry[]>(feed);
  const [showFistBumpOverlay, setShowFistBumpOverlay] = useState(false);
  const [overlayBumpers, setOverlayBumpers] = useState<string[]>([]);
  const [overlayCount, setOverlayCount] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [animFrame, setAnimFrame] = useState<number>(1);
  const [showClash, setShowClash] = useState(false);
  const [newBumpSessionIds, setNewBumpSessionIds] = useState(() => new Set(newFistBumps.map((b) => b.sessionId)));
  const [newFeedIds, setNewFeedIds] = useState(() => new Set(newFeedSessionIds));
  const [fistBumpBadge, setFistBumpBadge] = useState(newFistBumps.length);
  const [feedBadge, setFeedBadge] = useState(newFeedSessionIds.length);
  const hasVisitedFeedRef = useRef(false);
  const router = useRouter();

  // Mark feed as seen when feed tab is clicked — trigger overlay, refresh navbar badge
  // Clear highlights only after user has visited feed and then leaves
  useEffect(() => {
    if (view === "main" && tab === "feed") {
      hasVisitedFeedRef.current = true;
      markSocialSeen("feed");
      if (fistBumpBadge > 0) {
        const names = [...new Set(newFistBumps.map((b) => b.bumperUsername ?? b.bumperName ?? "Someone"))];
        setOverlayBumpers(names);
        setOverlayCount(newFistBumps.length);
        setShowConfetti(false);
        setAnimFrame(1);
        setShowClash(false);
        setShowFistBumpOverlay(true);
      }
      setFistBumpBadge(0);
      setFeedBadge(0);
      router.refresh();
    } else if (hasVisitedFeedRef.current) {
      setNewBumpSessionIds(new Set());
      setNewFeedIds(new Set());
    }
  }, [view, tab]); // eslint-disable-line react-hooks/exhaustive-deps

  // 10-frame fistbump animation × 3 cycles — clash + confetti only on the final frame
  useEffect(() => {
    if (!showFistBumpOverlay) return;
    const frames = [1,2,3,4,5,6,7,8,9,10];
    const seq = [...frames, ...frames, ...frames]; // 30 steps
    let step = 0;
    const id = setInterval(() => {
      step++;
      if (step >= seq.length) {
        clearInterval(id);
        setShowConfetti(true);
        return;
      }
      setAnimFrame(seq[step]);
      if (step === seq.length - 1) {
        setShowClash(true);
        setTimeout(() => setShowClash(false), 520);
      }
    }, 110);
    return () => clearInterval(id);
  }, [showFistBumpOverlay]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFriendRemoved = (userId: string) => {
    setFriends((prev) => prev.filter((f) => f.userId !== userId));
    router.refresh();
  };

  const handleRequestActioned = (friendshipId: string) => {
    setPendingState((prev) => prev.filter((r) => r.id !== friendshipId));
    router.refresh(); // re-fetches friends list + clears navbar badge
  };

  const handleOpenManage = useCallback(() => {
    setView("manage");
    markSocialSeen("requests");
  }, []);

  const handleFistBump = useCallback((sessionId: string) => {
    // Optimistic update
    setFeedState((prev) =>
      prev.map((entry) => {
        if (entry.sessionId !== sessionId) return entry;
        const wasBumped = entry.myFistBump;
        return {
          ...entry,
          myFistBump: !wasBumped,
          fistBumps: wasBumped
            ? entry.fistBumps.slice(0, -1) // remove one bump count
            : [...entry.fistBumps, { userId: "__me__", name: null, username: null }],
        };
      })
    );
    toggleFistBump(sessionId).then((result) => {
      if (!result.success) {
        setFeedState(feed); // revert on error
      }
    });
  }, [feed]);

  const filteredFeed = feedState.filter((entry) => {
    if (feedFilter === "me") return entry.isOwnWorkout;
    if (feedFilter === "friends") return !entry.isOwnWorkout;
    return true;
  });

  const overlayText =
    overlayBumpers.length === 0 ? ""
    : overlayBumpers.length === 1 ? overlayBumpers[0]
    : overlayBumpers.length === 2 ? `${overlayBumpers[0]} & ${overlayBumpers[1]}`
    : `${overlayBumpers[0]} +${overlayBumpers.length - 1}`;

  if (view === "manage") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setView("main")} className="flex items-center justify-center h-8 w-8 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Manage Friends</h1>
        </div>

        {/* Invite link */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white mb-1">Invite via link</h2>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-3">
            Anyone who opens this link will be added as your friend automatically.
          </p>
          <div className="flex gap-2">
            <div className="flex-1 min-w-0 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-xs text-zinc-500 dark:text-zinc-400 truncate font-mono">
              {typeof window !== "undefined"
                ? `${window.location.origin}/invite/${inviteToken}`
                : `/invite/${inviteToken}`}
            </div>
            <button
              onClick={() => {
                const url = `${window.location.origin}/invite/${inviteToken}`;
                navigator.clipboard.writeText(url).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                });
              }}
              className="flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex-shrink-0"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Link2 className="h-3.5 w-3.5" />}
              {copied ? "Copied!" : "Copy"}
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Hey! Join me on Gym Tracker 💪 ${typeof window !== "undefined" ? window.location.origin : ""}/invite/${inviteToken}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors flex-shrink-0"
            >
              WhatsApp
            </a>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white mb-3">Add by username</h2>
          <AddFriendForm />
        </div>

        {pendingState.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white px-0.5">
              Friend Requests{" "}
              <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium px-2 py-0.5">{pendingState.length}</span>
            </h2>
            <div className="space-y-2">
              {pendingState.map((req) => (
                <FriendRequestCard key={req.id} friendshipId={req.id} sender={req.sender} onAccepted={() => handleRequestActioned(req.id)} onDeclined={() => handleRequestActioned(req.id)} />
              ))}
            </div>
          </div>
        )}

        {pendingSent.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 px-0.5">Sent Requests</h2>
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800">
              {pendingSent.map((req) => {
                const r = req.receiver;
                return (
                  <div key={req.id} className="flex items-center gap-3 px-4 py-3">
                    {r.image ? (
                      <img src={r.image} alt={r.username ?? r.name ?? ""} className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-sm font-bold">
                        {(r.username?.[0] ?? r.name?.[0] ?? "?").toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{r.username ?? r.name ?? "Unknown"}</p>
                      {r.name && r.username && <p className="text-xs text-zinc-400 truncate">{r.name}</p>}
                    </div>
                    <span className="text-xs text-zinc-400 dark:text-zinc-500">Pending</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {friends.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white px-0.5">Friends <span className="ml-1 font-normal text-zinc-400">{friends.length}</span></h2>
            <div className="space-y-2">
              {friends.map((f) => (
                <FriendManageRow key={f.userId} friend={f} globalPrivacy={privacy} onRemoved={handleFriendRemoved} />
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white px-0.5">Global Defaults</h2>
          <GlobalPrivacySettings initial={privacy} />
        </div>
      </div>
    );
  }

  // Main view (Feed / Friends tabs)
  return (
    <div className="space-y-5">
      {/* Fist bump notification overlay */}
      {showFistBumpOverlay && (
        <>
          <style>{`
            @keyframes fb-fade-in { from { opacity: 0 } to { opacity: 1 } }
            @keyframes fb-slide-up { from { transform: translateY(48px) scale(0.92); opacity: 0 } to { transform: translateY(0) scale(1); opacity: 1 } }
            @keyframes fb-frame-pop { 0% { transform: scale(0.78) rotate(-8deg); } 65% { transform: scale(1.1) rotate(4deg); } 100% { transform: scale(1) rotate(0deg); } }
            @keyframes confetti-fly { 0% { transform: translate(0,0) rotate(0deg) scale(1); opacity: 1 } 70% { opacity: 1 } 100% { transform: translate(var(--cx),var(--cy)) rotate(540deg) scale(0.2); opacity: 0 } }
            @keyframes clash-ray { 0% { opacity: 1; transform: rotate(var(--rd)) translateY(-18px) scaleY(0.1); } 100% { opacity: 0; transform: rotate(var(--rd)) translateY(-38px) scaleY(1); } }
            @keyframes clash-burst { 0% { opacity: 0.9; transform: scale(0.2); } 100% { opacity: 0; transform: scale(2.8); } }
            @keyframes clash-star { 0% { opacity: 1; transform: scale(0) rotate(0deg); } 70% { opacity: 1; transform: scale(1) rotate(30deg); } 100% { opacity: 0; transform: scale(1.1) rotate(40deg); } }
          `}</style>
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-6"
            style={{ animation: "fb-fade-in 0.25s ease both" }}
            onClick={() => setShowFistBumpOverlay(false)}
          >
            <div
              className="relative w-full max-w-xs rounded-3xl bg-white dark:bg-zinc-900 p-8 text-center shadow-2xl border border-zinc-100 dark:border-zinc-800"
              style={{ animation: "fb-slide-up 0.4s cubic-bezier(0.34,1.56,0.64,1) both" }}
              onClick={() => setShowFistBumpOverlay(false)}
            >
              <button
                onClick={(e) => { e.stopPropagation(); setShowFistBumpOverlay(false); }}
                className="absolute top-4 right-4 flex h-7 w-7 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
              {/* Confetti particles */}
              {showConfetti && CONFETTI_PARTICLES.map((p) => (
                <div
                  key={p.id}
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "38%",
                    width: p.size,
                    height: p.size,
                    backgroundColor: p.color,
                    borderRadius: p.round ? "50%" : "2px",
                    animation: `confetti-fly 0.9s ease-out ${p.delay}ms both`,
                    "--cx": `${p.dx}px`,
                    "--cy": `${p.dy}px`,
                    pointerEvents: "none",
                  } as React.CSSProperties}
                />
              ))}
              {/* 3-frame fistbump animation */}
              <div className="relative w-28 h-28 mx-auto mb-5 select-none">
                <img
                  key={animFrame}
                  src={`/fistbump${animFrame}.png`}
                  alt="fist bump"
                  className="w-full h-full object-contain dark:invert"
                  style={{ animation: "fb-frame-pop 0.26s cubic-bezier(0.34,1.56,0.64,1) both" }}
                />
                {/* Comic clash effect on frame 3 */}
                {showClash && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    {[0, 60, 120, 180, 240, 300].map((deg) => (
                      <div
                        key={deg}
                        style={{
                          position: "absolute",
                          width: "4px",
                          height: "22px",
                          background: "#fbbf24",
                          borderRadius: "3px",
                          left: "50%",
                          top: "50%",
                          marginLeft: "-2px",
                          marginTop: "-11px",
                          transformOrigin: "50% 50%",
                          "--rd": `${deg}deg`,
                          animation: "clash-ray 0.38s ease-out forwards",
                        } as React.CSSProperties}
                      />
                    ))}
                    {/* centre burst */}
                    <div style={{
                      position: "absolute",
                      width: "20px", height: "20px",
                      background: "#fbbf24",
                      borderRadius: "50%",
                      animation: "clash-burst 0.38s ease-out forwards",
                    }} />
                    {/* star */}
                    <div style={{
                      position: "absolute",
                      width: "14px", height: "14px",
                      background: "#f97316",
                      clipPath: "polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)",
                      animation: "clash-star 0.38s ease-out forwards",
                    }} />
                  </div>
                )}
              </div>
              <p className="text-lg font-bold text-zinc-900 dark:text-white leading-snug">
                {overlayText}
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                {overlayCount === 1
                  ? "gave you a fist bump!"
                  : `gave you ${overlayCount} fist bumps!`}
              </p>
            </div>
          </div>
        </>
      )}
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Social</h1>
        <div className="flex items-center gap-2">
          {/* Tab pills */}
          <div className="flex items-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-1 gap-1">
            <button
              onClick={() => setTab("feed")}
              className={`relative rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${tab === "feed" ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"}`}
            >
              Feed
              {fistBumpBadge > 0 && (
                <span className="absolute -top-2 -right-1 flex items-center gap-px text-[8px] font-bold leading-none">
                  <img src="/fistbump10.png" alt="" className="h-5 w-5 object-contain fb-icon" />
                  <span className="text-amber-500">{fistBumpBadge > 9 ? "9+" : fistBumpBadge}</span>
                </span>
              )}
              {feedBadge > 0 && (
                <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-500 text-white text-[8px] font-bold leading-none">
                  {feedBadge > 9 ? "9+" : feedBadge}
                </span>
              )}
            </button>
            <button
              onClick={() => setTab("friends")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${tab === "friends" ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"}`}
            >
              Friends
            </button>
          </div>
          {/* Manage icon */}
          <button
            onClick={handleOpenManage}
            className="relative flex items-center justify-center h-9 w-9 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors"
            title="Add friends / manage"
          >
            <UserPlus className="h-4 w-4" />
            {pendingState.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
                {pendingState.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Stats panel — always visible */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-3 text-center">
          <Users className="h-4 w-4 text-zinc-400 dark:text-zinc-500 mx-auto mb-1" strokeWidth={1.5} />
          <div className="text-xl font-bold text-zinc-900 dark:text-white tabular-nums">{friends.length}</div>
          <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">Friends</div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-3 text-center">
          <img src="/fistbump10.png" alt="" className="h-6 w-6 object-contain mx-auto mb-1 fb-icon" />
          <div className="text-xl font-bold text-zinc-900 dark:text-white tabular-nums">{socialStats.totalFistBumpsReceived}</div>
          <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">Fist bumps</div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-3 text-center">
          <Dumbbell className="h-4 w-4 text-zinc-400 dark:text-zinc-500 mx-auto mb-1" strokeWidth={1.5} />
          <div className="text-xl font-bold text-zinc-900 dark:text-white tabular-nums">{socialStats.totalWorkoutsTracked}</div>
          <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">Workouts</div>
        </div>
      </div>

      {/* Feed tab */}
      {tab === "feed" && (
        <div className="space-y-3">
          {/* Filter pills */}
          <div className="flex items-center gap-2">
            {(["all", "me", "friends"] as FeedFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFeedFilter(f)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  feedFilter === f
                    ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                    : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                {f === "all" ? "All" : f === "me" ? "Me" : "Friends"}
              </button>
            ))}
          </div>

          {filteredFeed.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 p-10 text-center">
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">No workouts here</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                {feedFilter === "friends"
                  ? "No friend workouts in the last 14 days."
                  : "Completed workouts appear here."}
              </p>
            </div>
          ) : (
            filteredFeed.map((entry) => {
              const isBumpHighlight = newBumpSessionIds.has(entry.sessionId);
              const isFeedHighlight = newFeedIds.has(entry.sessionId);
              const color = isBumpHighlight ? "amber" as const : isFeedHighlight ? "blue" as const : undefined;
              return <FeedCard key={entry.sessionId} entry={entry} onFistBump={handleFistBump} highlightColor={color} />;
            })
          )}
        </div>
      )}

      {/* Friends tab */}
      {tab === "friends" && (
        friends.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 p-10 text-center space-y-4">
            <UserPlus className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto" />
            <div>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">No friends yet</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                Add friends to see their workouts and share yours.
              </p>
            </div>
            <button
              onClick={handleOpenManage}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-4 py-2 transition-colors"
            >
              <UserPlus className="h-4 w-4" />
              Add Friends
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {friends.map((f) => (
              <FriendExpandableCard key={f.userId} data={f} globalPrivacy={privacy} />
            ))}
          </div>
        )
      )}
    </div>
  );
}
