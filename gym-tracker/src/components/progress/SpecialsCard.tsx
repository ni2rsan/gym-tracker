"use client";

import { Suspense, useState, useMemo, useEffect, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment } from "@react-three/drei";
import { Box3, Vector3 } from "three";

const NI2RSAN_ID = "cmmp9a6ad000001nmo6ypuixp";

// Preload both GLBs immediately — cached before any Canvas mounts
useGLTF.preload("/Early Adopter.glb");
useGLTF.preload("/The Architect.glb");

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

function LoadedSignal({ onLoaded }: { onLoaded: () => void }) {
  useEffect(() => { onLoaded(); }, [onLoaded]);
  return null;
}

function ModelScene({
  path,
  autoRotateSpeed,
  onLoaded,
}: {
  path: string;
  autoRotateSpeed: number;
  onLoaded?: () => void;
}) {
  return (
    <>
      <ambientLight intensity={1.2} />
      <directionalLight position={[3, 5, 3]} intensity={0.8} />
      <Suspense fallback={null}>
        <NormalizedModel path={path} />
        <Environment preset="city" />
        {onLoaded && <LoadedSignal onLoaded={onLoaded} />}
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

function BadgeRow({
  badge,
  onOpen,
}: {
  badge: Badge;
  onOpen: (badge: Badge) => void;
}) {
  return (
    <div className="flex items-center gap-4">
      <div className="relative w-28 h-28 shrink-0">
        <Canvas
          shadows={false}
          camera={{ position: [0, 0, 3], fov: 50 }}
          style={{ width: "100%", height: "100%" }}
        >
          <ModelScene path={badge.path} autoRotateSpeed={1.5} />
        </Canvas>
        <div
          className="absolute inset-0 cursor-pointer"
          onClick={() => onOpen(badge)}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-0.5">
          {badge.tag}
        </p>
        <p className="text-base font-bold text-zinc-900 dark:text-white leading-snug mb-1">
          {badge.title}
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
          {badge.subtext}
        </p>
      </div>
    </div>
  );
}

interface SpecialsCardProps {
  userId: string;
}

export function SpecialsCard({ userId }: SpecialsCardProps) {
  const [modalBadge, setModalBadge] = useState<Badge | null>(null);
  const [introSeen, setIntroSeen] = useState<boolean | null>(null);
  const [introModelLoaded, setIntroModelLoaded] = useState(false);

  const introKey = `early-adopter-intro-seen-v4-${userId}`;
  const isAdmin = userId === NI2RSAN_ID;

  useEffect(() => {
    try {
      setIntroSeen(!!localStorage.getItem(introKey));
    } catch {
      setIntroSeen(true);
    }
  }, [introKey]);

  const dismissIntro = () => {
    try { localStorage.setItem(introKey, "1"); } catch { /* ignore */ }
    setIntroSeen(true);
  };

  const handleIntroLoaded = useCallback(() => setIntroModelLoaded(true), []);

  return (
    <>
      {/* One-time intro popup — rendered at opacity:0 so Canvas pre-warms in background */}
      {introSeen !== true && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60"
          style={{
            opacity: introSeen === false ? 1 : 0,
            pointerEvents: introSeen === false ? "auto" : "none",
          }}
          onClick={dismissIntro}
        >
          <div
            className="bg-white dark:bg-zinc-900 rounded-2xl p-6 max-w-xs w-full text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full h-64 mb-4">
              <Canvas
                shadows={false}
                camera={{ position: [0, 0, 3], fov: 50 }}
                style={{ width: "100%", height: "100%" }}
              >
                <ModelScene
                  path="/Early Adopter.glb"
                  autoRotateSpeed={2}
                  onLoaded={handleIntroLoaded}
                />
              </Canvas>
              {!introModelLoaded && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <p className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-1">
              Special · Early Adopter
            </p>
            <p className="text-lg font-bold text-zinc-900 dark:text-white leading-snug mb-2">
              OG
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              You were here before the hype. Before the updates. Before anyone else knew what this was. You believed early. That makes you one of us forever.
            </p>
            <button
              onClick={dismissIntro}
              className="mt-4 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Badge detail modal */}
      {modalBadge && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60"
          onClick={() => setModalBadge(null)}
        >
          <div
            className="bg-white dark:bg-zinc-900 rounded-2xl p-6 max-w-xs w-full text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full h-64 mb-4">
              <Canvas
                shadows={false}
                camera={{ position: [0, 0, 3], fov: 50 }}
                style={{ width: "100%", height: "100%" }}
              >
                <ModelScene path={modalBadge.path} autoRotateSpeed={2} />
              </Canvas>
            </div>
            <p className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-1">
              {modalBadge.tag}
            </p>
            <p className="text-lg font-bold text-zinc-900 dark:text-white leading-snug">
              {modalBadge.title}
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
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800">
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
            Specials
          </span>
        </div>

        <div className="px-4 py-4 space-y-4">
          {/* Row 1 — admin only */}
          {isAdmin && (
            <BadgeRow badge={THE_ARCHITECT} onOpen={setModalBadge} />
          )}

          {/* Divider between badges when both are visible */}
          {isAdmin && (
            <div className="border-t border-zinc-100 dark:border-zinc-800" />
          )}

          {/* Row 2 — Early Adopter */}
          <BadgeRow badge={EARLY_ADOPTER} onOpen={setModalBadge} />
        </div>
      </div>
    </>
  );
}
