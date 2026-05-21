"use client";

import { Component, Suspense, useState, useMemo, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment } from "@react-three/drei";
import type { SectionLayout } from "@/core/domain/badgeLayout";
import { Box3, Vector3 } from "three";

// Preload compressed GLBs (meshopt, no Draco — no decoder needed)
try {
  useGLTF.preload("/Early Adopter.glb");
  useGLTF.preload("/The Architect.glb");
} catch {
  // Silently skip — Canvas will still attempt to load on render
}

// Error boundary: catches WebGL failures without crashing the page
class CanvasErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex items-center justify-center w-full h-full bg-zinc-100 dark:bg-zinc-800 rounded-lg">
            <p className="text-[10px] text-zinc-400">3D not available</p>
          </div>
        )
      );
    }
    return this.props.children;
  }
}

function NormalizedModel({ path, onLoaded }: { path: string; onLoaded?: () => void }) {
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

  // Signal parent that the model finished loading
  const signalled = useRef(false);
  useEffect(() => {
    if (!signalled.current) {
      signalled.current = true;
      onLoaded?.();
    }
  }, [onLoaded]);

  return <primitive object={normalized} />;
}

// Detect WebGL support once
function supportsWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

// Loading spinner — hidden via loaded flag
function CanvasSpinner({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// Shared Canvas GL config — lightweight for mobile
const CANVAS_GL = { antialias: false, powerPreference: "low-power" as const, alpha: true };

interface Badge {
  path: string;
  tag: string;
  title: string;
  subtext: string;
}

const EARLY_ADOPTER: Badge = {
  path: "/Early Adopter.glb",
  tag: "Special · Early Adopter",
  title: "OG",
  subtext:
    "You were here before the hype. Before the updates. Before anyone else knew what this was. You believed early. That makes you one of us forever.",
};

const THE_ARCHITECT: Badge = {
  path: "/The Architect.glb",
  tag: "Special · Admin Only",
  title: "The Architect",
  subtext:
    "You didn't just build the gym. You built the whole world around it. Every badge, every milestone, every rep tracked — it started with you.",
};

/** Inline badge row — shows a single rotating 3D model or loading spinner */
function BadgeRow({ badge, onOpen }: { badge: Badge; onOpen: (badge: Badge) => void }) {
  const [canRender, setCanRender] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Only mount Canvas when badge scrolls into viewport (saves WebGL contexts)
  useEffect(() => {
    const el = ref.current;
    if (!el || !supportsWebGL()) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // eslint-disable-next-line react-hooks/set-state-in-effect -- viewport trigger
          setCanRender(true);
          obs.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div className="flex items-center gap-4">
      <div
        ref={ref}
        className="relative w-28 h-28 shrink-0 cursor-pointer"
        onClick={() => onOpen(badge)}
      >
        {canRender ? (
          <CanvasErrorBoundary>
            <Canvas
              shadows={false}
              dpr={[1, 1.5]}
              gl={CANVAS_GL}
              camera={{ position: [0, 0, 3], fov: 50 }}
              style={{ width: "100%", height: "100%" }}
            >
              <ambientLight intensity={0.5} />
              <directionalLight position={[3, 5, 3]} intensity={1} />
              <Suspense fallback={null}>
                <NormalizedModel path={badge.path} onLoaded={() => setLoaded(true)} />
                <Environment files="/potsdamer_platz_1k.hdr" />
              </Suspense>
              <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={1.5} />
            </Canvas>
            <CanvasSpinner visible={!loaded} />
          </CanvasErrorBoundary>
        ) : (
          <CanvasSpinner visible />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-0.5">
          {badge.tag}
        </p>
        <p className="text-base font-bold text-zinc-900 dark:text-white leading-snug mb-1">
          {badge.title}
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">{badge.subtext}</p>
      </div>
    </div>
  );
}

interface SpecialsCardProps {
  userId: string;
  isAdmin?: boolean;
  layout?: SectionLayout | null;
}

function BadgeModal({ badge, onClose }: { badge: Badge; onClose: () => void }) {
  const [loaded, setLoaded] = useState(false);
  const [webgl] = useState(supportsWebGL);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-zinc-900 rounded-2xl p-6 max-w-xs w-full text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative w-full h-64 mb-4">
          {webgl ? (
            <CanvasErrorBoundary>
              <Canvas
                shadows={false}
                dpr={[1, 2]}
                gl={CANVAS_GL}
                camera={{ position: [0, 0, 3], fov: 50 }}
                style={{ width: "100%", height: "100%" }}
              >
                <ambientLight intensity={0.5} />
                <directionalLight position={[3, 5, 3]} intensity={1} />
                <Suspense fallback={null}>
                  <NormalizedModel path={badge.path} onLoaded={() => setLoaded(true)} />
                  <Environment files="/potsdamer_platz_1k.hdr" />
                </Suspense>
                <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={2} />
              </Canvas>
              <CanvasSpinner visible={!loaded} />
            </CanvasErrorBoundary>
          ) : (
            <div className="flex items-center justify-center w-full h-full bg-zinc-100 dark:bg-zinc-800 rounded-lg">
              <p className="text-sm text-zinc-400">3D not available on this device</p>
            </div>
          )}
        </div>
        <p className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-1">
          {badge.tag}
        </p>
        <p className="text-lg font-bold text-zinc-900 dark:text-white leading-snug mb-2">
          {badge.title}
        </p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
          {badge.subtext}
        </p>
        <button
          onClick={onClose}
          className="mt-4 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
        >
          Close
        </button>
      </div>
    </div>
  );
}

export function SpecialsCard({ userId, isAdmin = false, layout }: SpecialsCardProps) {
  const [modalBadge, setModalBadge] = useState<Badge | null>(null);
  const [webgl] = useState(supportsWebGL);

  return (
    <>
      {/* Badge detail modal — single Canvas, only mounts when open */}
      {modalBadge && <BadgeModal badge={modalBadge} onClose={() => setModalBadge(null)} />}

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
                {webgl ? (
                  <CanvasErrorBoundary>
                    <Canvas
                      shadows={false}
                      dpr={[1, 1.5]}
                      gl={CANVAS_GL}
                      camera={{ position: [0, 0, 3], fov: 50 }}
                      style={{ width: "100%", aspectRatio: "1" }}
                    >
                      <ambientLight intensity={0.5} />
                      <directionalLight position={[3, 5, 3]} intensity={1} />
                      <Suspense fallback={null}>
                        <NormalizedModel path={EARLY_ADOPTER.path} />
                        <Environment files="/potsdamer_platz_1k.hdr" />
                      </Suspense>
                      <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={1.5} />
                    </Canvas>
                  </CanvasErrorBoundary>
                ) : (
                  <div className="w-full aspect-square bg-zinc-800/50 rounded-full" />
                )}
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
                {webgl ? (
                  <CanvasErrorBoundary>
                    <Canvas
                      shadows={false}
                      dpr={[1, 1.5]}
                      gl={CANVAS_GL}
                      camera={{ position: [0, 0, 3], fov: 50 }}
                      style={{ width: "100%", aspectRatio: "1" }}
                    >
                      <ambientLight intensity={0.5} />
                      <directionalLight position={[3, 5, 3]} intensity={1} />
                      <Suspense fallback={null}>
                        <NormalizedModel path={THE_ARCHITECT.path} />
                        <Environment files="/potsdamer_platz_1k.hdr" />
                      </Suspense>
                      <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={1.5} />
                    </Canvas>
                  </CanvasErrorBoundary>
                ) : (
                  <div className="w-full aspect-square bg-zinc-800/50 rounded-full" />
                )}
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
