"use client";

import { Suspense, useState, useMemo, useEffect } from "react";
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

// showEnvironment=false skips the HDR download — model appears immediately from preloaded GLB
function ModelScene({ autoRotateSpeed, showEnvironment }: { autoRotateSpeed: number; showEnvironment: boolean }) {
  return (
    <>
      {/* Higher intensity lights when no environment map */}
      <ambientLight intensity={showEnvironment ? 1.2 : 2.5} />
      <directionalLight position={[3, 5, 3]} intensity={showEnvironment ? 0.8 : 2.0} />
      <directionalLight position={[-3, 2, -3]} intensity={showEnvironment ? 0 : 1.0} />
      <Suspense fallback={null}>
        <EarlyAdopterModel />
        {showEnvironment && <Environment preset="city" />}
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

  // Key is scoped to userId so different accounts on the same browser don't share it
  const introKey = `early-adopter-intro-seen-v2-${userId}`;

  useEffect(() => {
    try {
      setIntroSeen(!!localStorage.getItem(introKey));
    } catch {
      setIntroSeen(true); // if localStorage is blocked, skip the popup
    }
  }, [introKey]);

  const dismissIntro = () => {
    try { localStorage.setItem(introKey, "1"); } catch { /* ignore */ }
    setIntroSeen(true);
  };

  return (
    <>
      {/* One-time intro popup
          Rendered (hidden) from the start so the Canvas warms up before it's shown.
          No Environment here — GLB is preloaded so it appears immediately without the HDR download. */}
      {introSeen !== true && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60"
          style={{
            visibility: introSeen === false ? "visible" : "hidden",
            pointerEvents: introSeen === false ? "auto" : "none",
          }}
          onClick={dismissIntro}
        >
          <div
            className="bg-white dark:bg-zinc-900 rounded-2xl p-6 max-w-xs w-full text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Background so canvas is never blank-white while loading */}
            <div className="w-full h-64 mb-4">
              <Canvas
                shadows={false}
                camera={{ position: [0, 0, 3], fov: 50 }}
                style={{ width: "100%", height: "100%" }}
              >
                <ModelScene autoRotateSpeed={2} showEnvironment={true} />
              </Canvas>
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

      {/* Manual modal overlay — uses Environment for richer look since it's on demand */}
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
                <ModelScene autoRotateSpeed={2} showEnvironment={true} />
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
              <ModelScene autoRotateSpeed={1.5} showEnvironment={true} />
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
