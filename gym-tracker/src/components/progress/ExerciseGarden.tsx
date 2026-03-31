"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TreeState, TreeStage } from "@/lib/gardenUtils";
import { STAGE_THRESHOLDS, TREE_CAPACITY } from "@/lib/gardenUtils";

// ─── Tree metadata ───────────────────────────────────────────────────────────

const TREE1_STAGES: { stage: TreeStage; name: string; subtext: string; img: string }[] = [
  {
    stage: 1,
    name: "Ember Seed",
    subtext: "A single rep. A single spark. The ember waits for fuel.",
    img: "/tree1stage1.png",
  },
  {
    stage: 2,
    name: "Cinder Sprout",
    subtext: "You came back. The flame catches. Smoke rises from the ground.",
    img: "/tree1stage2.png",
  },
  {
    stage: 3,
    name: "Ashwood Sapling",
    subtext: "Session after session, the fire grows. The bark won\u2019t bend anymore.",
    img: "/tree1stage3.png",
  },
  {
    stage: 4,
    name: "Flamecrown Juvenile",
    subtext: "Your discipline fed the flame. The crown ignites and won\u2019t go out.",
    img: "/tree1stage4.png",
  },
  {
    stage: 5,
    name: "Emberveil Mature",
    subtext: "Months of stardust, months of fire. The heat you carry now is permanent.",
    img: "/tree1stage5.png",
  },
  {
    stage: 6,
    name: "The Eternal Pyre",
    subtext: "You are the fire now. Every rep was a log. It will never go out.",
    img: "/tree1stage6.png",
  },
];

function getTree1Data(upToStage: number) {
  return TREE1_STAGES.filter((s) => s.stage <= upToStage);
}

// ─── Fire sparks ─────────────────────────────────────────────────────────────

const SPARK_COUNT = 12;

function FireSparks({ stage, isBlue }: { stage: number; isBlue: boolean }) {
  const sparks = useMemo(() => {
    return Array.from({ length: SPARK_COUNT }, (_, i) => {
      const angle = ((-150 + (i / (SPARK_COUNT - 1)) * 120) * Math.PI) / 180;
      const distance = 18 + ((i * 11) % 28);
      return {
        left: `${20 + ((i * 43 + 7) % 60)}%`,
        dx: `${(Math.cos(angle) * distance).toFixed(1)}px`,
        dy: `${(Math.sin(angle) * distance).toFixed(1)}px`,
        delay: `${(i * 0.22) % 1.8}s`,
        duration: `${0.8 + (i % 4) * 0.25}s`,
        size: 2 + (i % 3),
      };
    });
  }, []);

  const color = isBlue ? "#3b82f6" : "#f97316";
  const glow = isBlue ? "0 0 4px 1px #60a5fa" : "0 0 4px 1px #fb923c";
  // stage 1: center, stage 2: lower-top, stage 3+: top third
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
      <div className="w-10 h-10 rounded-full border-2 border-dashed border-zinc-400 dark:border-zinc-600 flex items-center justify-center">
        <span className="text-lg">🔥</span>
      </div>
      <span className="text-[10px] text-zinc-400 dark:text-zinc-600 font-medium tracking-wide uppercase">
        Locked
      </span>
    </div>
  );
}

// ─── Tree card ───────────────────────────────────────────────────────────────

function TreeCard({
  tree,
  stageName,
  imgSrc,
  isMaxStage,
  onClick,
}: {
  tree: TreeState;
  stageName: string;
  imgSrc: string | null;
  isMaxStage: boolean;
  onClick: () => void;
}) {
  const isUnlocked = tree.isUnlocked;

  return (
    <button
      onClick={isUnlocked ? onClick : undefined}
      disabled={!isUnlocked}
      className={cn(
        "flex flex-col items-center rounded-2xl border transition-colors shrink-0",
        "w-[100px] bg-white dark:bg-zinc-900",
        isUnlocked
          ? "border-zinc-200 dark:border-zinc-700 cursor-pointer hover:border-orange-300 dark:hover:border-orange-700 active:scale-[0.97]"
          : "border-zinc-100 dark:border-zinc-800 cursor-default opacity-50"
      )}
    >
      <div className="relative w-full rounded-t-2xl overflow-hidden bg-zinc-50 dark:bg-zinc-800">
        {isUnlocked && imgSrc ? (
          <>
            <img
              src={imgSrc}
              alt={stageName}
              className="w-full h-auto block"
              style={
                isMaxStage
                  ? { animation: "blazeGlow 2.8s ease-in-out infinite" }
                  : undefined
              }
            />
            <FireSparks stage={tree.stage} isBlue={isMaxStage} />
          </>
        ) : (
          <div className="h-24">
            <LockedPlaceholder />
          </div>
        )}
      </div>

      <div className="px-1.5 py-1.5 w-full text-center space-y-0.5">
        <p className="text-[10px] font-semibold text-zinc-800 dark:text-zinc-200 leading-tight truncate">
          {isUnlocked ? stageName : "???"}
        </p>
        {isUnlocked && (
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 tabular-nums">
            {tree.stardust}
            {tree.isComplete ? "" : `/${TREE_CAPACITY}`}{" "}
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

// ─── Detail overlay ──────────────────────────────────────────────────────────

function DetailOverlay({ tree, onClose }: { tree: TreeState; onClose: () => void }) {
  const maxViewableStage = tree.stage;
  const [viewStage, setViewStage] = useState(maxViewableStage);
  const stageData = TREE1_STAGES.find((s) => s.stage === viewStage)!;
  const isMaxStage = viewStage === 6;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xs bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Image */}
        <div className="w-full flex justify-center pt-6 pb-2 px-8">
          <div className="relative w-full">
            <img
              src={stageData.img}
              alt={stageData.name}
              className="w-full h-auto block"
              style={
                isMaxStage
                  ? { animation: "blazeGlow 2.8s ease-in-out infinite" }
                  : undefined
              }
            />
            <FireSparks stage={viewStage} isBlue={isMaxStage} />
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-4 pt-2 pb-1">
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
            onClick={() => setViewStage((s) => Math.min(maxViewableStage, s + 1) as TreeStage)}
            disabled={viewStage >= maxViewableStage}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-20 transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Text */}
        <div className="px-5 pb-5 pt-1 text-center space-y-1">
          {isMaxStage && (
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

// ─── Main component ───────────────────────────────────────────────────────────

export function ExerciseGarden({ stardustTotal, trees }: { stardustTotal: number; trees: TreeState[] }) {
  const [detailTree, setDetailTree] = useState<TreeState | null>(null);
  const tree1 = trees[0];

  return (
    <>
      <style>{`
        @keyframes gardenSpark {
          0%   { transform: translate(0, 0) scale(1); opacity: 0.9; }
          60%  { opacity: 0.5; }
          100% { transform: translate(var(--spark-dx), var(--spark-dy)) scale(0.1); opacity: 0; }
        }
        @keyframes blazeGlow {
          0%, 100% { filter: drop-shadow(0 0 4px #3b82f6) drop-shadow(0 0 10px #60a5fa); }
          50%       { filter: drop-shadow(0 0 10px #3b82f6) drop-shadow(0 0 22px #60a5fa) drop-shadow(0 0 32px #2563eb); }
        }
      `}</style>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800">
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
            Exercise Garden
          </span>
          <span className="flex items-center gap-1 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            {stardustTotal}
            <img src="/stardusticon.png" alt="stardust" className="h-4 w-4 -mt-0.5" />
          </span>
        </div>

        <div className="px-4 py-4 overflow-x-auto">
          <div className="flex gap-3 min-w-max">
            {trees.map((tree) => {
              const isTree1 = tree.treeIndex === 0;
              const meta = isTree1 ? TREE1_STAGES.find((s) => s.stage === tree.stage) : null;
              return (
                <TreeCard
                  key={tree.treeIndex}
                  tree={tree}
                  stageName={meta?.name ?? ""}
                  imgSrc={meta?.img ?? null}
                  isMaxStage={isTree1 && tree.stage === 6}
                  onClick={() => setDetailTree(tree)}
                />
              );
            })}
          </div>
        </div>

        <div className="px-4 pb-3 -mt-1">
          <p className="text-[10px] text-zinc-400 dark:text-zinc-600 text-center">
            {tree1.isComplete
              ? (trees[1]?.isUnlocked ? "Tending the next tree" : "All trees growing — more coming soon")
              : (
                <>
                  {STAGE_THRESHOLDS.find((t) => t > tree1.stardust) ?? TREE_CAPACITY}{" "}
                  <img src="/stardusticon.png" alt="stardust" className="inline-block h-3 w-3 -mt-0.5 align-middle" />{" "}
                  needed to evolve · earn by improving exercises
                </>
              )}
          </p>
        </div>
      </div>

      {detailTree && detailTree.treeIndex === 0 && (
        <DetailOverlay tree={detailTree} onClose={() => setDetailTree(null)} />
      )}
    </>
  );
}

// ─── DEACTIVATED: 3D GLB model code ─────────────────────────────────────────
// Replaced by individual PNG images per stage. See git history for the full
// Three.js / @react-three/fiber implementation.
