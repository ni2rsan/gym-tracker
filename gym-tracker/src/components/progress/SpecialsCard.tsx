"use client";

import { Suspense, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Stage } from "@react-three/drei";

// Preload immediately — GLB is cached before Canvas mounts
useGLTF.preload("/Early Adopter.glb");

function EarlyAdopterModel() {
  const { scene } = useGLTF("/Early Adopter.glb");
  return <primitive object={scene} />;
}

function ModelScene({ autoRotateSpeed }: { autoRotateSpeed: number }) {
  return (
    <>
      <Suspense fallback={null}>
        {/* Stage auto-fits camera to model bounding box and handles lighting */}
        <Stage adjustCamera={1.1} preset="rembrandt" environment="city">
          <EarlyAdopterModel />
        </Stage>
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
              <Canvas>
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
        {/* Header */}
        <div className="px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800">
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
            Specials
          </span>
        </div>

        <div className="px-4 py-4 flex items-center gap-4">
          {/* 3D model — div wrapper so pointer events don't conflict with canvas */}
          <div
            className="w-28 h-28 shrink-0 cursor-pointer"
            onClick={() => setModalOpen(true)}
          >
            <Canvas>
              <ModelScene autoRotateSpeed={1.5} />
            </Canvas>
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
