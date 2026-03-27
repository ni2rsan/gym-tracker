"use client";

import { Suspense, useState, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { Box3, Vector3 } from "three";

// Preload immediately — GLB is cached before Canvas mounts
useGLTF.preload("/Early Adopter.glb");

function EarlyAdopterModel() {
  const { scene } = useGLTF("/Early Adopter.glb");

  // Clone + normalize to a 2-unit bounding box so fixed camera always sees it fully
  const normalized = useMemo(() => {
    const clone = scene.clone(true);
    const box = new Box3().setFromObject(clone);
    const center = box.getCenter(new Vector3());
    const size = box.getSize(new Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim === 0) return clone;
    const scale = 2 / maxDim;
    clone.scale.setScalar(scale);
    // Re-center after scaling
    clone.position.copy(center.multiplyScalar(-scale));
    return clone;
  }, [scene]);

  return <primitive object={normalized} />;
}

function ModelScene({ autoRotateSpeed }: { autoRotateSpeed: number }) {
  return (
    <>
      <ambientLight intensity={1.6} />
      <directionalLight position={[3, 5, 3]} intensity={1} />
      <Suspense fallback={null}>
        <EarlyAdopterModel />
      </Suspense>
      <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={autoRotateSpeed} />
    </>
  );
}

export function SpecialsCard() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      {/* Modal overlay */}
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
          {/* Canvas wrapper — transparent overlay captures click without blocking OrbitControls drag */}
          <div className="relative w-28 h-28 shrink-0">
            <Canvas
              shadows={false}
              camera={{ position: [0, 0, 3], fov: 50 }}
              style={{ width: "100%", height: "100%" }}
            >
              <ModelScene autoRotateSpeed={1.5} />
            </Canvas>
            {/* Invisible tap target on top — only triggers modal, doesn't block drag */}
            <div
              className="absolute inset-0 cursor-pointer"
              onClick={() => setModalOpen(true)}
            />
          </div>

          {/* Text */}
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
