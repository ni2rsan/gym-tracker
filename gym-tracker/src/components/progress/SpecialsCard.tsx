"use client";

import { Suspense, useState, useMemo, useEffect, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment } from "@react-three/drei";
import { Box3, Vector3 } from "three";

// Preload GLB immediately — cached before any Canvas mounts
useGLTF.preload("/Early Adopter.glb");

function EarlyAdopterModel() {
  const { scene } = useGLTF("/Early Adopter.glb");
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

// Signals the parent (DOM) when Suspense has fully resolved
function LoadedSignal({ onLoaded }: { onLoaded: () => void }) {
  useEffect(() => { onLoaded(); }, [onLoaded]);
  return null;
}

function ModelScene({
  autoRotateSpeed,
  onLoaded,
}: {
  autoRotateSpeed: number;
  onLoaded?: () => void;
}) {
  return (
    <>
      <ambientLight intensity={1.2} />
      <directionalLight position={[3, 5, 3]} intensity={0.8} />
      <Suspense fallback={null}>
        <EarlyAdopterModel />
        <Environment preset="city" />
        {onLoaded && <LoadedSignal onLoaded={onLoaded} />}
      </Suspense>
      <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={autoRotateSpeed} />
    </>
  );
}

interface SpecialsCardProps {
  userId: string;
}

export function SpecialsCard({ userId }: SpecialsCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  // null = not yet checked, false = show intro, true = already seen
  const [introSeen, setIntroSeen] = useState<boolean | null>(null);
  const [introModelLoaded, setIntroModelLoaded] = useState(false);

  // Scoped to userId — different accounts on same browser each track independently
  const introKey = `early-adopter-intro-seen-v4-${userId}`;

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
      {/* One-time intro popup
          Rendered at opacity:0 from the start so Canvas actually initializes
          and loads the Environment HDR in the background.
          visibility:hidden would skip WebGL rendering entirely — opacity:0 does not. */}
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
                <ModelScene autoRotateSpeed={2} onLoaded={handleIntroLoaded} />
              </Canvas>
              {/* Spinner shown until model + Environment are fully loaded */}
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

      {/* Manual modal overlay */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60"
          onClick={() => setModalOpen(false)}
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
                {/* No onLoaded needed — Environment is already in drei's cache from the pre-warm */}
                <ModelScene autoRotateSpeed={2} />
              </Canvas>
            </div>
            <p className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-1">
              Special · Early Adopter
            </p>
            <p className="text-lg font-bold text-zinc-900 dark:text-white leading-snug">
              OG
            </p>
            <button
              onClick={() => setModalOpen(false)}
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

        <div className="px-4 py-4 flex items-center gap-4">
          <div className="relative w-28 h-28 shrink-0">
            <Canvas
              shadows={false}
              camera={{ position: [0, 0, 3], fov: 50 }}
              style={{ width: "100%", height: "100%" }}
            >
              <ModelScene autoRotateSpeed={1.5} />
            </Canvas>
            <div
              className="absolute inset-0 cursor-pointer"
              onClick={() => setModalOpen(true)}
            />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-0.5">
              Special · Early Adopter
            </p>
            <p className="text-base font-bold text-zinc-900 dark:text-white leading-snug mb-1">
              OG
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              You were here before the hype. Before the updates. Before anyone else knew what this was. You believed early. That makes you one of us forever.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
