"use client";

import { Suspense, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Bounds, Environment } from "@react-three/drei";

// Preload immediately when this module is parsed — GLB is cached before Canvas mounts
useGLTF.preload("/Early Adopter.glb");

function EarlyAdopterModel() {
  const { scene } = useGLTF("/Early Adopter.glb");
  return <primitive object={scene} />;
}

function ModelScene({ autoRotateSpeed }: { autoRotateSpeed: number }) {
  return (
    <>
      <ambientLight intensity={0.9} />
      <directionalLight position={[5, 5, 5]} intensity={1.2} />
      <Suspense fallback={null}>
        <Bounds fit clip observe>
          <EarlyAdopterModel />
        </Bounds>
        <Environment preset="city" />
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
            <div className="w-full h-60 mb-4">
              <Canvas camera={{ fov: 45 }}>
                <ModelScene autoRotateSpeed={2} />
              </Canvas>
            </div>
            <p className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-1">
              Special · Early Adopter
            </p>
            <p className="text-sm font-bold text-zinc-900 dark:text-white leading-snug mb-2">
              OG
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              You were here before the hype. Before the updates. Before anyone else knew what this was. You believed early. That makes you one of us forever.
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

        <div className="px-4 py-4">
          {/* 3D model — centered, reasonable size, clickable */}
          <button
            onClick={() => setModalOpen(true)}
            className="w-40 h-40 mx-auto block focus:outline-none cursor-pointer"
            aria-label="View Early Adopter badge"
          >
            <Canvas camera={{ fov: 45 }}>
              <ModelScene autoRotateSpeed={1.5} />
            </Canvas>
          </button>

          {/* Text */}
          <div className="mt-3 text-center">
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
