"use client";

import { Suspense, useRef, useMemo, useState, useEffect, Component } from "react";
import type { ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment } from "@react-three/drei";
import { Box3, Vector3, Group } from "three";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TreeState } from "@/lib/gardenUtils";
import { STAGE_THRESHOLDS, TREE_CAPACITY } from "@/lib/gardenUtils";

// Models are loaded on demand via Suspense. No preload to avoid downloading
// all stages (stage 5 alone is 380 MB) on every page visit.

// ─── Error boundary ───────────────────────────────────────────────────────────

class CanvasErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex items-center justify-center h-full text-zinc-300 dark:text-zinc-600 text-xs">
          3D unavailable
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Tree metadata ────────────────────────────────────────────────────────────

const TREE1_STAGES = [
  {
    stage: 1 as const,
    path: "/tree1stage1.glb",
    name: "Tiny Seed",
    subtext: "Every legend starts as a seed. Your first rep was the first step.",
  },
  {
    stage: 2 as const,
    path: "/tree1stage2.glb",
    name: "First Sprout",
    subtext: "Life is stirring. Consistency is your water and sunlight.",
  },
  {
    stage: 3 as const,
    path: "/tree1stage3.glb",
    name: "Growing Sapling",
    subtext: "Roots running deeper. Your dedication is beginning to take real shape.",
  },
  {
    stage: 4 as const,
    path: "/tree1stage4.glb",
    name: "Young Tree",
    subtext: "Strong, steady, and impossible to ignore. The work shows.",
  },
  {
    stage: 5 as const,
    path: "/tree1stage5.glb",
    name: "Ancient Oak",
    subtext:
      "You built this — rep by rep, session by session. A monument to what showing up every day can create.",
  },
];

/** Returns the stage metadata for tree 1 up to the given current stage */
function getTree1Data(upToStage: number) {
  return TREE1_STAGES.filter((s) => s.stage <= upToStage);
}

// ─── 3D helpers ───────────────────────────────────────────────────────────────

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

/** Wiggling group: gentle pendulum + bob, NO auto-rotate */
function WiggleGroup({ children }: { children: React.ReactNode }) {
  const groupRef = useRef<Group>(null!);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (!groupRef.current) return;
    groupRef.current.rotation.y = Math.sin(t * 0.75) * 0.22;
    groupRef.current.rotation.z = Math.sin(t * 0.55 + 1.1) * 0.055;
    groupRef.current.position.y = Math.sin(t * 1.1) * 0.035;
  });
  return <group ref={groupRef}>{children}</group>;
}

// ─── Card 3D canvas (wiggle, no orbit) ───────────────────────────────────────

function TreeCardCanvas({ path }: { path: string }) {
  return (
    <CanvasErrorBoundary>
      <Canvas
        shadows={false}
        camera={{ position: [0, 0, 3.2], fov: 50 }}
        style={{ width: "100%", height: "100%" }}
      >
        <ambientLight intensity={1.3} />
        <directionalLight position={[3, 5, 3]} intensity={0.9} />
        <Suspense fallback={null}>
          <WiggleGroup>
            <NormalizedModel path={path} />
          </WiggleGroup>
          <Environment preset="forest" />
        </Suspense>
      </Canvas>
    </CanvasErrorBoundary>
  );
}

// ─── Stage 5 mystical glow styles ─────────────────────────────────────────────

const MYSTICAL_GLOW_STYLE: React.CSSProperties = {
  animation: "mysticalPulse 2.8s ease-in-out infinite",
  borderRadius: "1rem",
};

// ─── Locked placeholder card ──────────────────────────────────────────────────

function LockedPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-2 opacity-30">
      <div className="w-12 h-12 rounded-full border-2 border-dashed border-zinc-400 dark:border-zinc-600 flex items-center justify-center">
        <span className="text-xl">🌱</span>
      </div>
      <span className="text-[10px] text-zinc-400 dark:text-zinc-600 font-medium tracking-wide uppercase">
        Locked
      </span>
    </div>
  );
}

// ─── Tree card ────────────────────────────────────────────────────────────────

interface TreeCardProps {
  tree: TreeState;
  stageName: string;
  modelPath: string | null;
  isStage5: boolean;
  onClick: () => void;
}

function TreeCard({ tree, stageName, modelPath, isStage5, onClick }: TreeCardProps) {
  const isUnlocked = tree.isUnlocked;

  return (
    <button
      onClick={isUnlocked ? onClick : undefined}
      disabled={!isUnlocked}
      className={cn(
        "flex flex-col items-center rounded-2xl border transition-colors shrink-0",
        "w-36 bg-white dark:bg-zinc-900",
        isUnlocked
          ? "border-zinc-200 dark:border-zinc-700 cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700 active:scale-[0.97]"
          : "border-zinc-100 dark:border-zinc-800 cursor-default opacity-50"
      )}
      style={isStage5 && isUnlocked ? MYSTICAL_GLOW_STYLE : undefined}
    >
      {/* 3D canvas or placeholder */}
      <div className="w-full h-32 rounded-t-2xl overflow-hidden">
        {isUnlocked && modelPath ? (
          <TreeCardCanvas path={modelPath} />
        ) : (
          <LockedPlaceholder />
        )}
      </div>

      {/* Info */}
      <div className="px-2 py-2 w-full text-center space-y-0.5">
        <p className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 leading-tight truncate">
          {isUnlocked ? stageName : "???"}
        </p>
        {isUnlocked && (
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
            {tree.stardust}
            {tree.isComplete ? "" : `/${TREE_CAPACITY}`}
            {" "}
            <img
              src="/stardusticon.png"
              alt="stardust"
              className="inline-block h-3.5 w-3.5 -mt-0.5 align-middle"
            />
          </p>
        )}
      </div>
    </button>
  );
}

// ─── Detail overlay ───────────────────────────────────────────────────────────

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

        {/* 3D canvas — full OrbitControls */}
        <div
          className="w-full h-64"
          style={viewStage === 5 ? MYSTICAL_GLOW_STYLE : undefined}
        >
          <CanvasErrorBoundary>
            <Canvas
              shadows={false}
              camera={{ position: [0, 0, 3.2], fov: 50 }}
              style={{ width: "100%", height: "100%" }}
            >
              <ambientLight intensity={1.3} />
              <directionalLight position={[3, 5, 3]} intensity={0.9} />
              <Suspense fallback={null}>
                <NormalizedModel path={stageData.path} />
                <Environment preset="forest" />
              </Suspense>
              <OrbitControls enableZoom={false} />
            </Canvas>
          </CanvasErrorBoundary>
        </div>

        {/* Stage navigation */}
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <button
            onClick={() => setViewStage((s) => Math.max(1, s - 1) as 1 | 2 | 3 | 4 | 5)}
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
                    ? "bg-emerald-500"
                    : "bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-400"
                )}
              />
            ))}
          </div>

          <button
            onClick={() =>
              setViewStage((s) => Math.min(maxViewableStage, s + 1) as 1 | 2 | 3 | 4 | 5)
            }
            disabled={viewStage >= maxViewableStage}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-20 transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Text */}
        <div className="px-5 pb-5 pt-1 text-center space-y-1">
          {viewStage === 5 && (
            <p className="text-[10px] font-bold text-purple-500 uppercase tracking-widest">
              ✨ Maximum Growth ✨
            </p>
          )}
          <p className="text-base font-bold text-zinc-900 dark:text-white leading-snug">
            {stageData.name}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            {stageData.subtext}
          </p>
          {/* Stage label */}
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
  const currentStageData = TREE1_STAGES.find((s) => s.stage === tree1.stage)!;

  // Preload only the model the user will actually see on the card
  useEffect(() => {
    if (tree1.isUnlocked && currentStageData) {
      useGLTF.preload(currentStageData.path);
    }
  }, [tree1.isUnlocked, currentStageData]);

  return (
    <>
      {/* Keyframes — injected once */}
      <style>{`
        @keyframes mysticalPulse {
          0%, 100% {
            box-shadow: 0 0 8px 3px #a855f7, 0 0 18px 6px #ec4899;
          }
          50% {
            box-shadow: 0 0 18px 8px #a855f7, 0 0 36px 14px #ec4899, 0 0 55px 20px #8b5cf6;
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
              const modelPath = isTree1
                ? TREE1_STAGES.find((s) => s.stage === tree.stage)?.path ?? null
                : null;
              const stageName = isTree1
                ? (TREE1_STAGES.find((s) => s.stage === tree.stage)?.name ?? "")
                : "";
              const isStage5 = isTree1 && tree.stage === 5;

              return (
                <TreeCard
                  key={tree.treeIndex}
                  tree={tree}
                  stageName={stageName}
                  modelPath={modelPath}
                  isStage5={isStage5}
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
              ? `${trees[1]?.isUnlocked ? "Tending the next tree" : "All trees growing — more coming soon"}`
              : `${STAGE_THRESHOLDS.find((t) => t > tree1.stardust) ?? TREE_CAPACITY} ${String.fromCodePoint(0x2728)} needed to evolve · earn by improving exercises`}
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
