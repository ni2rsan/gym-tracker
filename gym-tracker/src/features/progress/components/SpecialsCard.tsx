"use client";

import { Component, Suspense, useState, useMemo, useEffect } from "react";
import type { ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment } from "@react-three/drei";
import { cn } from "@/core/utils/cn";
import type { SectionLayout } from "@/core/domain/badgeLayout";
import { Box3, Vector3 } from "three";

// Preload both GLBs — wrapped in try/catch for devices without WebGL support
try {
  useGLTF.preload("/Early Adopter.glb");
  useGLTF.preload("/The Architect.glb");
} catch {
  // Silently skip preload on devices where Three.js init fails at module level
}

// Error boundary that shows a fallback instead of crashing the page
class ModelErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

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

function ModelScene({
  path,
  autoRotateSpeed,
}: {
  path: string;
  autoRotateSpeed: number;
}) {
  return (
    <>
      <ambientLight intensity={1.2} />
      <directionalLight position={[3, 5, 3]} intensity={0.8} />
      <Suspense fallback={null}>
        <NormalizedModel path={path} />
        <Environment preset="city" />
      </Suspense>
      <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={autoRotateSpeed} />
    </>
  );
}

interface Badge {
  path: string;
  tag: string;
  title: string;
  subtext: string;
  emoji: string;
}

const EARLY_ADOPTER: Badge = {
  path: "/Early Adopter.glb",
  tag: "Special · Early Adopter",
  title: "OG",
  subtext:
    "You were here before the hype. Before the updates. Before anyone else knew what this was. You believed early. That makes you one of us forever.",
  emoji: "⭐",
};

const THE_ARCHITECT: Badge = {
  path: "/The Architect.glb",
  tag: "Special · Admin Only",
  title: "The Architect",
  subtext:
    "You didn't just build the gym. You built the whole world around it. Every badge, every milestone, every rep tracked — it started with you.",
  emoji: "🏗️",
};

// Static badge row — no Canvas, just text. 3D loads only when user taps.
function BadgeRow({ badge, onOpen }: { badge: Badge; onOpen: (badge: Badge) => void }) {
  return (
    <div
      className="flex items-center gap-4 cursor-pointer active:bg-zinc-50 dark:active:bg-zinc-800/50 rounded-xl transition-colors -mx-1 px-1 py-1"
      onClick={() => onOpen(badge)}
    >
      <div className="flex items-center justify-center w-20 h-20 shrink-0 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-3xl">
        {badge.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-0.5">
          {badge.tag}
        </p>
        <p className="text-base font-bold text-zinc-900 dark:text-white leading-snug mb-1">
          {badge.title}
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-2">
          {badge.subtext}
        </p>
      </div>
    </div>
  );
}

// 3D modal fallback when WebGL fails
function ModelFallback({ badge }: { badge: Badge }) {
  return (
    <div className="w-full h-64 mb-4 flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-800 rounded-xl">
      <span className="text-5xl mb-2">{badge.emoji}</span>
      <p className="text-xs text-zinc-400">3D model not available on this device</p>
    </div>
  );
}

interface SpecialsCardProps {
  userId: string;
  isAdmin?: boolean;
  layout?: SectionLayout | null;
}

export function SpecialsCard({ userId, isAdmin = false, layout }: SpecialsCardProps) {
  const [modalBadge, setModalBadge] = useState<Badge | null>(null);

  return (
    <>
      {/* Badge detail modal — 3D model loads only here, on user click */}
      {modalBadge && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60"
          onClick={() => setModalBadge(null)}
        >
          <div
            className="bg-white dark:bg-zinc-900 rounded-2xl p-6 max-w-xs w-full text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <ModelErrorBoundary fallback={<ModelFallback badge={modalBadge} />}>
              <div className="relative w-full h-64 mb-4">
                <Canvas
                  shadows={false}
                  camera={{ position: [0, 0, 3], fov: 50 }}
                  style={{ width: "100%", height: "100%" }}
                >
                  <ModelScene path={modalBadge.path} autoRotateSpeed={2} />
                </Canvas>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin opacity-0 [.canvas-loading_&]:opacity-100" />
                </div>
              </div>
            </ModelErrorBoundary>
            <p className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-1">
              {modalBadge.tag}
            </p>
            <p className="text-lg font-bold text-zinc-900 dark:text-white leading-snug mb-2">
              {modalBadge.title}
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              {modalBadge.subtext}
            </p>
            <button
              onClick={() => setModalBadge(null)}
              className="mt-4 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Card */}
      {layout ? (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
              Specials
            </span>
          </div>
          <div
            className="relative w-full overflow-hidden"
            style={{ aspectRatio: String(layout.imageAspectRatio) }}
          >
            <img
              src={layout.backgroundImage}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ opacity: layout.backgroundOpacity }}
            />
            {layout.positions["early-adopter"] && (
              <div
                className="absolute cursor-pointer"
                style={{
                  left: `${layout.positions["early-adopter"].x}%`,
                  top: `${layout.positions["early-adopter"].y}%`,
                  transform: "translate(-50%, -50%)",
                  width: `${layout.badgeSizePercent}%`,
                }}
                onClick={() => setModalBadge(EARLY_ADOPTER)}
              >
                <div
                  className="flex items-center justify-center bg-amber-50/80 dark:bg-amber-950/50 rounded-full"
                  style={{ width: "100%", aspectRatio: "1" }}
                >
                  <span className="text-3xl">{EARLY_ADOPTER.emoji}</span>
                </div>
              </div>
            )}
            {isAdmin && layout.positions["architect"] && (
              <div
                className="absolute cursor-pointer"
                style={{
                  left: `${layout.positions["architect"].x}%`,
                  top: `${layout.positions["architect"].y}%`,
                  transform: "translate(-50%, -50%)",
                  width: `${layout.badgeSizePercent}%`,
                }}
                onClick={() => setModalBadge(THE_ARCHITECT)}
              >
                <div
                  className="flex items-center justify-center bg-amber-50/80 dark:bg-amber-950/50 rounded-full"
                  style={{ width: "100%", aspectRatio: "1" }}
                >
                  <span className="text-3xl">{THE_ARCHITECT.emoji}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
              Specials
            </span>
          </div>

          <div className="px-4 py-4 space-y-4">
            {/* Row 1 — admin only */}
            {isAdmin && <BadgeRow badge={THE_ARCHITECT} onOpen={setModalBadge} />}

            {/* Divider between badges when both are visible */}
            {isAdmin && <div className="border-t border-zinc-100 dark:border-zinc-800" />}

            {/* Row 2 — Early Adopter */}
            <BadgeRow badge={EARLY_ADOPTER} onOpen={setModalBadge} />
          </div>
        </div>
      )}
    </>
  );
}
