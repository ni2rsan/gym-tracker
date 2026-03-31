"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TreeState, TreeStage } from "@/lib/gardenUtils";
import { STAGE_THRESHOLDS, TREE_CAPACITY } from "@/lib/gardenUtils";

// ─── Sprite sheet constants ──────────────────────────────────────────────────
// tree1.png: 1933 x 475px, 6 stages side by side, 7px gap between each.

const SPRITE_W = 1933;
const SPRITE_H = 475;
const GAP = 7;
const STAGE_COUNT = 6;
const STAGE_W = (SPRITE_W - (STAGE_COUNT - 1) * GAP) / STAGE_COUNT; // ~316.33px

// ─── Tree metadata ───────────────────────────────────────────────────────────

const TREE1_STAGES: { stage: TreeStage; name: string; subtext: string }[] = [
  {
    stage: 1,
    name: "Ember Seed",
    subtext: "A single rep. A single spark. The ember waits for fuel.",
  },
  {
    stage: 2,
    name: "Cinder Sprout",
    subtext: "You came back. The flame catches. Smoke rises from the ground.",
  },
  {
    stage: 3,
    name: "Ashwood Sapling",
    subtext: "Session after session, the fire grows. The bark won\u2019t bend anymore.",
  },
  {
    stage: 4,
    name: "Flamecrown Juvenile",
    subtext: "Your discipline fed the flame. The crown ignites and won\u2019t go out.",
  },
  {
    stage: 5,
    name: "Emberveil Mature",
    subtext: "Months of stardust, months of fire. The heat you carry now is permanent.",
  },
  {
    stage: 6,
    name: "The Eternal Pyre",
    subtext: "You are the fire now. Every rep was a log. It will never go out.",
  },
];

function getTree1Data(upToStage: number) {
  return TREE1_STAGES.filter((s) => s.stage <= upToStage);
}

// ─── Stage image from sprite sheet ───────────────────────────────────────────
// bgPosX formula: stageIdx * (STAGE_W+GAP)*100 / (SPRITE_W-STAGE_W) ≈ stageIdx * 20%
// background-size 611% scales sprite so one stage = container width exactly.

// Uses <img> (not background-image) so filter: drop-shadow follows the PNG
// alpha channel, making the glow hug the actual tree shape.
// clip-path: inset(-glowPx) expands the clip region slightly so the glow
// bleeds out without showing adjacent stages.
function TreeStageImage({ stage, glow = false }: { stage: number; glow?: boolean }) {
  const stageIdx = stage - 1;
  // img width as % of container: sprite_total / one_stage
  const imgWidthPct = (SPRITE_W / STAGE_W) * 100; // ~611%
  // left offset as % of container width to align the correct stage
  const leftPct = -stageIdx * ((STAGE_W + GAP) / STAGE_W) * 100;
  const glowPx = glow ? 14 : 0;

  return (
    <div
      className="relative w-full"
      style={{
        aspectRatio: `${STAGE_W} / ${SPRITE_H}`,
        clipPath: `inset(${-glowPx}px)`,
      }}
    >
      <img
        src="/tree1.png"
        className="absolute top-0 h-full"
        style={{
          width: `${imgWidthPct}%`,
          left: `${leftPct}%`,
          filter: glow
            ? "drop-shadow(0 0 6px #3b82f6) drop-shadow(0 0 14px #60a5fa)"
            : undefined,
          animation: glow ? "blazeGlow 2.8s ease-in-out infinite" : undefined,
        }}
      />
    </div>
  );
}

// ─── Fire sparks effect ──────────────────────────────────────────────────────
// Stage 1: sparks origin at vertical center. All others: top third.
// Movement: outward in random directions (biased upward) via CSS custom props.

const SPARK_COUNT = 12;

function FireSparks({ stage, isBlue }: { stage: number; isBlue: boolean }) {
  const sparks = useMemo(() => {
    return Array.from({ length: SPARK_COUNT }, (_, i) => {
      // Spread angles across upper arc: -150° to -30° (0° = right, -90° = up)
      const angle = ((-150 + (i / (SPARK_COUNT - 1)) * 120) * Math.PI) / 180;
      const distance = 18 + (i * 11 % 28);
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance;
      return {
        // Horizontal scatter within the origin zone
        left: `${20 + ((i * 43 + 7) % 60)}%`,
        dx: `${dx.toFixed(1)}px`,
        dy: `${dy.toFixed(1)}px`,
        delay: `${(i * 0.22) % 1.8}s`,
        duration: `${0.8 + (i % 4) * 0.25}s`,
        size: 2 + (i % 3),
      };
    });
  }, []);

  const color = isBlue ? "#3b82f6" : "#f97316";
  const glow = isBlue ? "0 0 4px 1px #60a5fa" : "0 0 4px 1px #fb923c";
  // Stage 1: sparks from center; all others: from top third
  const originTop = stage === 1 ? "50%" : stage === 2 ? "38%" : "22%";

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {sparks.map((s, i) => (
        <span
          key={i}
          className="absolute rounded-full"
          style={{
            left: s.left,
            top: originTop,
            width: s.size,
            height: s.size,
            backgroundColor: color,
            boxShadow: glow,
            animation: `gardenSpark ${s.duration} ease-out ${s.delay} infinite`,
            // CSS custom properties used by the keyframe
            ["--spark-dx" as string]: s.dx,
            ["--spark-dy" as string]: s.dy,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

// ─── Locked placeholder ──────────────────────────────────────────────────────

function LockedPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-2 opacity-30">
      <div className="w-12 h-12 rounded-full border-2 border-dashed border-zinc-400 dark:border-zinc-600 flex items-center justify-center">
        <span className="text-xl">🔥</span>
      </div>
      <span className="text-[10px] text-zinc-400 dark:text-zinc-600 font-medium tracking-wide uppercase">
        Locked
      </span>
    </div>
  );
}

// ─── Tree card ───────────────────────────────────────────────────────────────

interface TreeCardProps {
  tree: TreeState;
  stageName: string;
  isMaxStage: boolean;
  onClick: () => void;
}

function TreeCard({ tree, stageName, isMaxStage, onClick }: TreeCardProps) {
  const isUnlocked = tree.isUnlocked;

  return (
    <button
      onClick={isUnlocked ? onClick : undefined}
      disabled={!isUnlocked}
      className={cn(
        "flex flex-col items-center rounded-2xl border transition-colors shrink-0",
        "w-[100px] bg-white dark:bg-zinc-900",
        isUnlocked
          ? "border-zinc-200 dark:border-zinc-700 cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700 active:scale-[0.97]"
          : "border-zinc-100 dark:border-zinc-800 cursor-default opacity-50"
      )}
    >
      {/* Image or placeholder — aspect-ratio drives height so nothing is clipped */}
      <div className="relative w-full rounded-t-2xl overflow-hidden">
        {isUnlocked ? (
          <>
            <TreeStageImage stage={tree.stage} glow={isMaxStage} />
            <FireSparks stage={tree.stage} isBlue={tree.stage === 6} />
          </>
        ) : (
          <div className="h-24">
            <LockedPlaceholder />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="px-1.5 py-1.5 w-full text-center space-y-0.5">
        <p className="text-[10px] font-semibold text-zinc-800 dark:text-zinc-200 leading-tight truncate">
          {isUnlocked ? stageName : "???"}
        </p>
        {isUnlocked && (
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 tabular-nums">
            {tree.stardust}
            {tree.isComplete ? "" : `/${TREE_CAPACITY}`}
            {" "}
            <img
              src="/stardusticon.png"
              alt="stardust"
              className="inline-block h-3 w-3 -mt-0.5 align-middle"
            />
          </p>
        )}
      </div>
    </button>
  );
}

// Stage 6 glow is handled via filter: drop-shadow on the <img> inside TreeStageImage.

// ─── Detail overlay ──────────────────────────────────────────────────────────

interface DetailOverlayProps {
  tree: TreeState;
  onClose: () => void;
}

function DetailOverlay({ tree, onClose }: DetailOverlayProps) {
  const maxViewableStage = tree.stage;
  const [viewStage, setViewStage] = useState(maxViewableStage);

  const stageData = TREE1_STAGES.find((s) => s.stage === viewStage)!;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xs bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Stage image — 55% width centered, aspect-ratio ensures no cropping */}
        <div className="w-full flex justify-center py-3">
          <div className="relative w-[55%]">
            <TreeStageImage stage={viewStage} glow={viewStage === 6} />
            <div className="absolute inset-0 overflow-hidden">
              <FireSparks stage={viewStage} isBlue={viewStage === 6} />
            </div>
          </div>
        </div>

        {/* Stage navigation */}
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <button
            onClick={() => setViewStage((s) => Math.max(1, s - 1) as TreeStage)}
            disabled={viewStage <= 1}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-20 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="flex gap-1">
            {getTree1Data(maxViewableStage).map((s) => (
              <button
                key={s.stage}
                onClick={() => setViewStage(s.stage)}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  viewStage === s.stage
                    ? "bg-orange-500"
                    : "bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-400"
                )}
              />
            ))}
          </div>

          <button
            onClick={() =>
              setViewStage((s) => Math.min(maxViewableStage, s + 1) as TreeStage)
            }
            disabled={viewStage >= maxViewableStage}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-20 transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Text */}
        <div className="px-5 pb-5 pt-1 text-center space-y-1">
          {viewStage === 6 && (
            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">
              🔥 Eternal Blaze 🔥
            </p>
          )}
          <p className="text-base font-bold text-zinc-900 dark:text-white leading-snug">
            {stageData.name}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            {stageData.subtext}
          </p>
          <p className="text-[10px] text-zinc-400 dark:text-zinc-600 pt-1">
            Stage {viewStage} of {maxViewableStage}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main ExerciseGarden component ───────────────────────────────────────────

interface ExerciseGardenProps {
  stardustTotal: number;
  trees: TreeState[];
}

export function ExerciseGarden({ stardustTotal, trees }: ExerciseGardenProps) {
  const [detailTree, setDetailTree] = useState<TreeState | null>(null);

  const tree1 = trees[0];

  return (
    <>
      {/* Keyframes */}
      <style>{`
        @keyframes gardenSpark {
          0%   { transform: translate(0, 0) scale(1); opacity: 0.9; }
          60%  { opacity: 0.5; }
          100% { transform: translate(var(--spark-dx), var(--spark-dy)) scale(0.1); opacity: 0; }
        }
        @keyframes blazeGlow {
          0%, 100% {
            filter: drop-shadow(0 0 4px #3b82f6) drop-shadow(0 0 10px #60a5fa);
          }
          50% {
            filter: drop-shadow(0 0 10px #3b82f6) drop-shadow(0 0 22px #60a5fa) drop-shadow(0 0 32px #2563eb);
          }
        }
      `}</style>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800">
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
            Exercise Garden
          </span>
          <span className="flex items-center gap-1 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            {stardustTotal}
            <img
              src="/stardusticon.png"
              alt="stardust"
              className="h-4 w-4 -mt-0.5"
            />
          </span>
        </div>

        {/* Scrollable tree row */}
        <div className="px-4 py-4 overflow-x-auto">
          <div className="flex gap-3 min-w-max">
            {trees.map((tree) => {
              const isTree1 = tree.treeIndex === 0;
              const stageName = isTree1
                ? (TREE1_STAGES.find((s) => s.stage === tree.stage)?.name ?? "")
                : "";
              const isMaxStage = isTree1 && tree.stage === 6;

              return (
                <TreeCard
                  key={tree.treeIndex}
                  tree={tree}
                  stageName={stageName}
                  isMaxStage={isMaxStage}
                  onClick={() => setDetailTree(tree)}
                />
              );
            })}
          </div>
        </div>

        {/* Stardust hint */}
        <div className="px-4 pb-3 -mt-1">
          <p className="text-[10px] text-zinc-400 dark:text-zinc-600 text-center">
            {tree1.isComplete
              ? (trees[1]?.isUnlocked ? "Tending the next tree" : "All trees growing — more coming soon")
              : (<>{STAGE_THRESHOLDS.find((t) => t > tree1.stardust) ?? TREE_CAPACITY}{" "}<img src="/stardusticon.png" alt="stardust" className="inline-block h-3 w-3 -mt-0.5 align-middle" />{" "}needed to evolve · earn by improving exercises</>)}
          </p>
        </div>
      </div>

      {/* Detail overlay */}
      {detailTree && detailTree.treeIndex === 0 && (
        <DetailOverlay tree={detailTree} onClose={() => setDetailTree(null)} />
      )}
    </>
  );
}

// ─── DEACTIVATED: 3D model code ─────────────────────────────────────────────
// The 3D GLB-based tree rendering has been deactivated in favor of the sprite
// sheet approach above. The GLB files (tree1stage1-5.glb) remain in /public
// but are no longer loaded. To re-enable, restore the Canvas/useGLTF-based
// TreeCardCanvas, NormalizedModel, BendingModel, and WiggleGroup components
// that were previously in this file. See git history for the full 3D code.
