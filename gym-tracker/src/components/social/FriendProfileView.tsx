"use client";

import { useState, useTransition, useMemo, Suspense } from "react";
import { Crown, ChevronDown, ChevronUp, Lock } from "lucide-react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment } from "@react-three/drei";
import { Box3, Vector3 } from "three";
import { cn } from "@/lib/utils";
import { upsertFriendPrivacyOverride } from "@/actions/social";
import { Toast } from "@/components/ui/Toast";
import { ExerciseIcon } from "@/components/workout/ExerciseIcon";
import type { FriendProfileData, PRRecord } from "@/types";
import type { MuscleGroup } from "@/types";

useGLTF.preload("/Early Adopter.glb");
useGLTF.preload("/The Architect.glb");

const WORKOUT_MILESTONES = [10, 30, 50, 75, 100];

const VOLUME_BADGES = [
  { key: "50t",   thresholdKg: 50_000    },
  { key: "100t",  thresholdKg: 100_000   },
  { key: "150t",  thresholdKg: 150_000   },
  { key: "250t",  thresholdKg: 250_000   },
  { key: "500t",  thresholdKg: 500_000   },
  { key: "750t",  thresholdKg: 750_000   },
  { key: "1000t", thresholdKg: 1_000_000 },
  { key: "1500t", thresholdKg: 1_500_000 },
  { key: "2000t", thresholdKg: 2_000_000 },
  { key: "2500t", thresholdKg: 2_500_000 },
  { key: "3000t", thresholdKg: 3_000_000 },
  { key: "4000t", thresholdKg: 4_000_000 },
  { key: "5000t", thresholdKg: 5_000_000 },
];

const FRIEND_BADGES_DEF = [
  { key: "1friend",   label: "1 Friend",   threshold: 1  },
  { key: "5friends",  label: "5 Friends",  threshold: 5  },
  { key: "10friends", label: "10 Friends", threshold: 10 },
];
const FISTBUMP_BADGES_DEF = [
  { key: "1fistbump",   label: "1 Fist Bump",  threshold: 1  },
  { key: "10fistbumps", label: "10 Fist Bumps", threshold: 10 },
  { key: "30fistbumps", label: "30 Fist Bumps", threshold: 30 },
];

function NormalizedModel({ path }: { path: string }) {
  const { scene } = useGLTF(path);
  const normalized = useMemo(() => {
    const clone = scene.clone(true);
    const box = new Box3().setFromObject(clone);
    const center = box.getCenter(new Vector3());
    const size = box.getSize(new Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim === 0) return clone;
    const scale = 2 / maxDim;
    clone.scale.setScalar(scale);
    clone.position.copy(center.multiplyScalar(-scale));
    return clone;
  }, [scene]);
  return <primitive object={normalized} />;
}

function CompactBadge3D({ path, title, tag }: { path: string; title: string; tag: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="w-12 h-12 shrink-0">
        <Canvas shadows={false} camera={{ position: [0, 0, 3], fov: 50 }} style={{ width: "100%", height: "100%" }}>
          <ambientLight intensity={1.2} />
          <directionalLight position={[3, 5, 3]} intensity={0.8} />
          <Suspense fallback={null}>
            <NormalizedModel path={path} />
            <Environment preset="city" />
          </Suspense>
          <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={2} />
        </Canvas>
      </div>
      <span className="text-[8px] font-bold text-amber-500 uppercase tracking-wide leading-none">{tag}</span>
      <span className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 leading-none">{title}</span>
    </div>
  );
}

const GROUP_META: Record<string, { label: string; color: string; dot: string }> = {
  UPPER_BODY: { label: "Upper Body",  color: "text-blue-600 dark:text-blue-400",   dot: "bg-blue-400"   },
  LOWER_BODY: { label: "Lower Body",  color: "text-green-600 dark:text-green-400", dot: "bg-green-400"  },
  BODYWEIGHT: { label: "Bodyweight",  color: "text-purple-600 dark:text-purple-400", dot: "bg-purple-400" },
};
const PR_ORDER = ["UPPER_BODY", "LOWER_BODY", "BODYWEIGHT"];
const COLLAPSED_COUNT = 5;

function PRSection({ prs }: { prs: PRRecord[] }) {
  const [expanded, setExpanded] = useState(false);

  const visiblePrs = expanded ? prs : prs.slice(0, COLLAPSED_COUNT);

  const grouped: Record<string, PRRecord[]> = {};
  for (const pr of visiblePrs) {
    if (!grouped[pr.muscleGroup]) grouped[pr.muscleGroup] = [];
    grouped[pr.muscleGroup].push(pr);
  }
  const groups = [
    ...PR_ORDER.filter((g) => grouped[g]),
    ...Object.keys(grouped).filter((g) => !PR_ORDER.includes(g)),
  ];

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
        <span className="text-xs">🏆</span>
        <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
          Personal Records
        </span>
      </div>
      <div className="p-2.5 space-y-3">
        {groups.map((group) => {
          const meta = GROUP_META[group] ?? { label: group, color: "text-zinc-600 dark:text-zinc-400", dot: "bg-zinc-400" };
          return (
            <div key={group}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", meta.dot)} />
                <span className={cn("text-[10px] font-bold uppercase tracking-widest", meta.color)}>
                  {meta.label}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1">
                {grouped[group].map((pr) => (
                  <div key={pr.exerciseId} className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-1.5 flex flex-col items-center gap-0.5 min-w-0">
                    <ExerciseIcon name={pr.exerciseName} muscleGroup={pr.muscleGroup as MuscleGroup} className="w-8 h-8" />
                    <span className="text-[10px] font-bold text-zinc-900 dark:text-white tabular-nums leading-tight text-center">
                      {pr.muscleGroup === "BODYWEIGHT" || pr.maxWeightKg == null
                        ? `${pr.maxReps ?? pr.repsAtMaxWeight}r`
                        : `${Number(pr.maxWeightKg).toFixed(1)}kg`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {prs.length > COLLAPSED_COUNT && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center justify-center gap-1.5 px-4 py-2 border-t border-zinc-100 dark:border-zinc-800 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
        >
          {expanded ? (
            <><ChevronUp className="h-3.5 w-3.5" /> Show less</>
          ) : (
            <><ChevronDown className="h-3.5 w-3.5" /> Show all {prs.length} PRs</>
          )}
        </button>
      )}
    </div>
  );
}


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
  showHeader = true,
}: {
  data: FriendProfileData;
  friendId: string;
  globalPrivacy: { shareWeight: boolean; shareBodyFat: boolean; sharePRs: boolean };
  showHeader?: boolean;
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
  const displayName = data.username ?? data.name;

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        {showHeader && (
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
              {data.name && data.username && <p className="text-sm text-zinc-500 dark:text-zinc-400">{data.name}</p>}
            </div>
          </div>
        )}

        {/* Body metrics — first */}
        {(data.heightCm != null || data.visibility.canSeeWeight || data.visibility.canSeeBodyFat) && (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Body Metrics</h3>
            </div>
            {(() => {
              const visibleCount = [data.heightCm != null, data.visibility.canSeeWeight, data.visibility.canSeeBodyFat].filter(Boolean).length;
              const colsClass = visibleCount >= 3 ? "grid-cols-3" : visibleCount === 2 ? "grid-cols-2" : "grid-cols-1";
              return (
                <div className={`grid divide-x divide-zinc-100 dark:divide-zinc-800 ${colsClass}`}>
                  {data.heightCm != null && (
                    <div className="px-4 py-3">
                      <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-0.5">Height</p>
                      <p className="text-xl font-bold text-zinc-900 dark:text-white">
                        {data.heightCm}<span className="text-xs font-normal text-zinc-400 ml-1">cm</span>
                      </p>
                    </div>
                  )}
                  {data.visibility.canSeeWeight && (
                    <div className="px-4 py-3">
                      <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-0.5">Weight</p>
                      <p className="text-xl font-bold text-zinc-900 dark:text-white">
                        {data.weight != null ? (
                          <>{data.weight.toFixed(1)}<span className="text-xs font-normal text-zinc-400 ml-1">kg</span></>
                        ) : (
                          <span className="text-zinc-400 text-base">—</span>
                        )}
                      </p>
                    </div>
                  )}
                  {data.visibility.canSeeBodyFat && (
                    <div className="px-4 py-3">
                      <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-0.5">Body Fat</p>
                      <p className="text-xl font-bold text-zinc-900 dark:text-white">
                        {data.bodyFatPct != null ? (
                          <>{data.bodyFatPct.toFixed(1)}<span className="text-xs font-normal text-zinc-400 ml-0.5">%</span></>
                        ) : (
                          <span className="text-zinc-400 text-base">—</span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* Achievements */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
            <Crown className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Achievements</span>
          </div>
          <div className="px-3 py-3 space-y-4">

            {/* Workout badges — milestone PNGs */}
            {(() => {
              const unlocked = WORKOUT_MILESTONES.filter((d) => data.milestonesUnlocked.includes(d));
              if (unlocked.length === 0) return null;
              return (
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-1.5">Workout</p>
                  <div className="flex flex-wrap gap-2">
                    {unlocked.map((days) => (
                      <div key={days} className="flex flex-col items-center gap-0.5 w-10">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`/milestones/${days}.png`} alt={`${days}d`} className="w-10 h-10 object-contain" />
                        <span className="text-[8px] font-semibold text-zinc-500 dark:text-zinc-400 leading-tight">{days}d</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Volume badges — casket PNGs */}
            {(() => {
              const unlocked = VOLUME_BADGES.filter((b) => (data.cumulativeVolume ?? 0) >= b.thresholdKg);
              if (unlocked.length === 0) return null;
              return (
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-1.5">Volume</p>
                  <div className="flex flex-wrap gap-2">
                    {unlocked.map((b) => (
                      <div key={b.key} className="flex flex-col items-center gap-0.5 w-10">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`/volume/${b.key}.png`} alt={b.key} className="w-10 h-10 object-contain" />
                        <span className="text-[8px] font-semibold text-zinc-500 dark:text-zinc-400 leading-tight">{b.key}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Social badges — friend + fistbump PNGs */}
            {(() => {
              const achievedFriends = FRIEND_BADGES_DEF.filter((b) => (data.friendCount ?? 0) >= b.threshold);
              const achievedFistbumps = FISTBUMP_BADGES_DEF.filter((b) => (data.fistbumpCount ?? 0) >= b.threshold);
              if (achievedFriends.length === 0 && achievedFistbumps.length === 0) return null;
              return (
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-1.5">Social</p>
                  <div className="flex flex-wrap gap-2">
                    {[...achievedFriends, ...achievedFistbumps].map((b) => (
                      <div key={b.key} className="flex flex-col items-center gap-0.5 w-12">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`/social/${b.key}.png`} alt={b.label} className="w-12 h-12 object-contain" />
                        <span className="text-[8px] font-semibold text-amber-600 dark:text-amber-400 leading-tight text-center">{b.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Specials — 3D models */}
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-1.5">Specials</p>
              <div className="flex gap-4">
                <CompactBadge3D path="/Early Adopter.glb" title="Early Adopter" tag="OG" />
                {data.isAdmin && (
                  <CompactBadge3D path="/The Architect.glb" title="The Architect" tag="Admin" />
                )}
              </div>
            </div>

          </div>
        </div>

        {/* PRs */}
        {data.visibility.canSeePRs && data.prs.length > 0 && (
          <PRSection prs={data.prs} />
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
