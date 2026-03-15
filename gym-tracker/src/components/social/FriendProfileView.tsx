"use client";

import { useState, useTransition } from "react";
import { Trophy, Flame, Crown, Medal, ChevronDown, ChevronUp, Lock } from "lucide-react";
import { upsertFriendPrivacyOverride } from "@/actions/social";
import { Toast } from "@/components/ui/Toast";
import type { FriendProfileData } from "@/types";

const MILESTONES = [
  { days: 10,  emoji: "🥉", label: "10 days" },
  { days: 30,  emoji: "🥈", label: "30 days" },
  { days: 50,  emoji: "🥇", label: "50 days" },
  { days: 75,  emoji: "💎", label: "75 days" },
  { days: 100, emoji: "👑", label: "100 days" },
];

type ToastState = { message: string; type: "success" | "error" } | null;

interface OverrideToggleProps {
  label: string;
  value: boolean | null;
  globalValue: boolean;
  onChange: (v: boolean | null) => void;
  disabled: boolean;
}

function OverrideToggle({ label, value, globalValue, onChange, disabled }: OverrideToggleProps) {
  const effective = value ?? globalValue;
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex flex-col">
        <span className="text-sm text-zinc-700 dark:text-zinc-300">{label}</span>
        {value !== null && (
          <span className="text-xs text-zinc-400 mt-0.5">Overriding global setting</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {value !== null && (
          <button
            onClick={() => onChange(null)}
            disabled={disabled}
            className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors disabled:opacity-50"
          >
            Reset
          </button>
        )}
        <button
          onClick={() => onChange(value === null ? !globalValue : !value)}
          disabled={disabled}
          className={`flex h-6 w-11 items-center rounded-full px-0.5 transition-colors disabled:opacity-50 ${
            effective
              ? "bg-emerald-500 justify-end"
              : "bg-zinc-200 dark:bg-zinc-700 justify-start"
          }`}
        >
          <div className="h-5 w-5 rounded-full bg-white shadow" />
        </button>
      </div>
    </div>
  );
}

export function FriendProfileView({
  data,
  friendId,
  globalPrivacy,
}: {
  data: FriendProfileData;
  friendId: string;
  globalPrivacy: { shareWeight: boolean; shareBodyFat: boolean; sharePRs: boolean };
}) {
  const [showOverrides, setShowOverrides] = useState(false);
  const [overrides, setOverrides] = useState(data.myOverride);
  const [toast, setToast] = useState<ToastState>(null);
  const [isPending, startTransition] = useTransition();

  const saveOverride = (patch: typeof overrides) => {
    setOverrides(patch);
    startTransition(async () => {
      const result = await upsertFriendPrivacyOverride(friendId, patch);
      if (!result.success) {
        setOverrides(overrides);
        setToast({ message: result.error ?? "Failed to save.", type: "error" });
      }
    });
  };

  const avatar = data.image;
  const displayName = data.name ?? data.username;

  return (
    <>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center gap-4">
          {avatar ? (
            <img src={avatar} alt={displayName} className="h-14 w-14 rounded-full object-cover ring-2 ring-zinc-200 dark:ring-zinc-700" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xl font-bold ring-2 ring-zinc-200 dark:ring-zinc-700">
              {(data.username[0] ?? "?").toUpperCase()}
            </div>
          )}
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">{displayName}</h2>
            {data.name && <p className="text-sm text-zinc-500 dark:text-zinc-400">@{data.username}</p>}
          </div>
        </div>

        {/* Streaks — always visible */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" />
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Streaks</h3>
          </div>
          <div className="grid grid-cols-3 divide-x divide-zinc-100 dark:divide-zinc-800">
            <div className="px-4 py-4 flex flex-col items-center gap-1">
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">{data.generalStreak}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center">Current streak</p>
            </div>
            <div className="px-4 py-4 flex flex-col items-center gap-1">
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">{data.bestStreak}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center">Best streak</p>
            </div>
            <div className="px-4 py-4 flex flex-col items-center gap-1">
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">{data.totalWorkoutsThisMonth}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center">This month</p>
            </div>
          </div>
        </div>

        {/* Milestones — always visible */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Crown className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Achievements</h3>
          </div>
          <div className="flex gap-3 flex-wrap">
            {MILESTONES.map((m) => {
              const unlocked = data.milestonesUnlocked.includes(m.days);
              return (
                <div
                  key={m.days}
                  className={`flex flex-col items-center gap-1 rounded-xl px-3 py-2.5 border transition-all ${
                    unlocked
                      ? "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20"
                      : "border-zinc-200 dark:border-zinc-800 opacity-40"
                  }`}
                >
                  <span className="text-2xl">{m.emoji}</span>
                  <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{m.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Body metrics */}
        {(data.visibility.canSeeWeight || data.visibility.canSeeBodyFat) && (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Body Metrics</h3>
            </div>
            <div className={`grid divide-x divide-zinc-100 dark:divide-zinc-800 ${data.visibility.canSeeWeight && data.visibility.canSeeBodyFat ? "grid-cols-2" : "grid-cols-1"}`}>
              {data.visibility.canSeeWeight && (
                <div className="px-5 py-4">
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1">Weight</p>
                  <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                    {data.weight != null ? (
                      <>{data.weight.toFixed(1)}<span className="text-sm font-normal text-zinc-400 ml-1">kg</span></>
                    ) : (
                      <span className="text-zinc-400 text-lg">—</span>
                    )}
                  </p>
                </div>
              )}
              {data.visibility.canSeeBodyFat && (
                <div className="px-5 py-4">
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1">Body Fat</p>
                  <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                    {data.bodyFatPct != null ? (
                      <>{data.bodyFatPct.toFixed(1)}<span className="text-sm font-normal text-zinc-400 ml-0.5">%</span></>
                    ) : (
                      <span className="text-zinc-400 text-lg">—</span>
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PRs */}
        {data.visibility.canSeePRs && data.prs.length > 0 && (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Personal Records</h3>
            </div>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {data.prs.slice(0, 10).map((pr) => (
                <div key={pr.exerciseId} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">{pr.exerciseName}</p>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500">{pr.achievedOn}</p>
                  </div>
                  <div className="text-right">
                    {pr.maxWeightKg != null ? (
                      <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                        {pr.maxWeightKg} kg
                        {pr.repsAtMaxWeight != null && (
                          <span className="text-xs font-normal text-zinc-400 ml-1">× {pr.repsAtMaxWeight}</span>
                        )}
                      </p>
                    ) : pr.maxReps != null ? (
                      <p className="text-sm font-semibold text-zinc-900 dark:text-white">{pr.maxReps} reps</p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Per-friend privacy overrides */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
          <button
            onClick={() => setShowOverrides((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-zinc-400" />
              <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                Privacy for this friend
              </span>
            </div>
            {showOverrides ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
          </button>
          {showOverrides && (
            <div className="px-5 pb-4 border-t border-zinc-100 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800">
              <p className="text-xs text-zinc-400 dark:text-zinc-500 pt-3 pb-2">
                Override your global settings just for this friend. "Reset" reverts to global.
              </p>
              <OverrideToggle
                label="Share my Weight"
                value={overrides.shareWeight}
                globalValue={globalPrivacy.shareWeight}
                onChange={(v) => saveOverride({ ...overrides, shareWeight: v })}
                disabled={isPending}
              />
              <OverrideToggle
                label="Share my Body Fat %"
                value={overrides.shareBodyFat}
                globalValue={globalPrivacy.shareBodyFat}
                onChange={(v) => saveOverride({ ...overrides, shareBodyFat: v })}
                disabled={isPending}
              />
              <OverrideToggle
                label="Share my PRs"
                value={overrides.sharePRs}
                globalValue={globalPrivacy.sharePRs}
                onChange={(v) => saveOverride({ ...overrides, sharePRs: v })}
                disabled={isPending}
              />
            </div>
          )}
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </>
  );
}
