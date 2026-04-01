"use client";

import { useState, useRef } from "react";
import { X, Copy, Check } from "lucide-react";
import type { SectionLayout, EditorBadge } from "@/lib/badgeLayout";

interface BadgeLayoutEditorProps {
  section: string;
  badges: EditorBadge[];
  initialLayout?: SectionLayout | null;
  onClose: () => void;
}

export function BadgeLayoutEditor({
  section,
  badges,
  initialLayout,
  onClose,
}: BadgeLayoutEditorProps) {
  const [bgInput, setBgInput] = useState(initialLayout?.backgroundImage ?? "");
  const [bgImage, setBgImage] = useState(initialLayout?.backgroundImage ?? "");
  const [aspectRatio, setAspectRatio] = useState(initialLayout?.imageAspectRatio ?? 1);
  const [badgeSizePercent, setBadgeSizePercent] = useState(initialLayout?.badgeSizePercent ?? 14);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>(
    initialLayout?.positions ?? {}
  );
  const [dragging, setDragging] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const placedKeys = new Set(Object.keys(positions));
  const trayBadges = badges.filter((b) => !placedKeys.has(b.key));

  function addToCanvas(key: string) {
    const existingCount = Object.keys(positions).length;
    setPositions((p) => ({
      ...p,
      [key]: {
        x: +(20 + (existingCount * 15) % 55).toFixed(1),
        y: +(20 + (existingCount * 15) % 55).toFixed(1),
      },
    }));
  }

  function removeFromCanvas(key: string) {
    setPositions((p) => {
      const next = { ...p };
      delete next[key];
      return next;
    });
  }

  function onBadgePointerDown(key: string, e: React.PointerEvent) {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(key);
  }

  function onBadgePointerMove(key: string, e: React.PointerEvent) {
    if (dragging !== key || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = +Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)).toFixed(1);
    const y = +Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)).toFixed(1);
    setPositions((p) => ({ ...p, [key]: { x, y } }));
  }

  function onBadgePointerUp() {
    setDragging(null);
  }

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      setAspectRatio(img.naturalWidth / img.naturalHeight);
    }
  }

  function copyJson() {
    const output: SectionLayout = {
      backgroundImage: bgImage,
      imageAspectRatio: +aspectRatio.toFixed(4),
      badgeSizePercent,
      positions,
    };
    navigator.clipboard.writeText(JSON.stringify(output, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const jsonOutput = JSON.stringify(
    { backgroundImage: bgImage, imageAspectRatio: +aspectRatio.toFixed(4), badgeSizePercent, positions },
    null,
    2
  );

  return (
    <div className="fixed inset-0 z-[90] bg-black/80 flex items-start justify-center overflow-y-auto p-4">
      <div
        className="relative w-full max-w-3xl bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl mt-4 mb-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
          <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 capitalize">
            Edit {section} Layout
          </p>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Background image path */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">
              Background Image Path
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={bgInput}
                onChange={(e) => setBgInput(e.target.value)}
                placeholder={`/badge-backgrounds/${section}.jpg`}
                className="flex-1 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none focus:border-orange-400"
              />
              <button
                onClick={() => setBgImage(bgInput)}
                className="px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                Load
              </button>
            </div>
          </div>

          {/* Badge size slider */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">
                Badge Size
              </label>
              <span className="text-[10px] font-mono text-zinc-500">{badgeSizePercent}%</span>
            </div>
            <input
              type="range"
              min={5}
              max={35}
              step={1}
              value={badgeSizePercent}
              onChange={(e) => setBadgeSizePercent(Number(e.target.value))}
              className="w-full accent-orange-500"
            />
          </div>

          {/* Canvas */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">
              Canvas — drag badges to position them
            </label>
            <div
              ref={canvasRef}
              className="relative w-full overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800 select-none"
              style={{ aspectRatio: String(aspectRatio) }}
            >
              {bgImage ? (
                <img
                  src={bgImage}
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                  onLoad={onImageLoad}
                  onError={() => setBgImage("")}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-[11px] text-zinc-400 text-center px-4">
                    Enter a background image path above and click Load
                  </p>
                </div>
              )}

              {badges.map((badge) => {
                const pos = positions[badge.key];
                if (!pos) return null;
                return (
                  <div
                    key={badge.key}
                    className="absolute"
                    style={{
                      left: `${pos.x}%`,
                      top: `${pos.y}%`,
                      transform: "translate(-50%, -50%)",
                      cursor: dragging === badge.key ? "grabbing" : "grab",
                      zIndex: dragging === badge.key ? 10 : 1,
                      touchAction: "none",
                    }}
                    onPointerDown={(e) => onBadgePointerDown(badge.key, e)}
                    onPointerMove={(e) => onBadgePointerMove(badge.key, e)}
                    onPointerUp={onBadgePointerUp}
                  >
                    <img
                      src={badge.imgSrc}
                      alt={badge.label}
                      className="object-contain drop-shadow-lg pointer-events-none"
                      style={{ width: `${badgeSizePercent * (canvasRef.current?.clientWidth ?? 400) / 100}px`, height: `${badgeSizePercent * (canvasRef.current?.clientWidth ?? 400) / 100}px` }}
                    />
                    <button
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[8px] flex items-center justify-center leading-none hover:bg-red-600 z-20"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromCanvas(badge.key);
                      }}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Badge tray */}
          {trayBadges.length > 0 && (
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">
                Badge Tray — click to add to canvas
              </label>
              <div className="flex flex-wrap gap-2 p-2 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl">
                {trayBadges.map((badge) => (
                  <button
                    key={badge.key}
                    onClick={() => addToCanvas(badge.key)}
                    className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                  >
                    <img
                      src={badge.imgSrc}
                      alt={badge.label}
                      className="w-12 h-12 object-contain"
                    />
                    <span className="text-[8px] font-semibold text-zinc-500 uppercase">
                      {badge.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {trayBadges.length === 0 && Object.keys(positions).length > 0 && (
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 text-center font-medium">
              All badges placed on canvas
            </p>
          )}

          {/* JSON output */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">
                JSON Output
              </label>
              <button
                onClick={copyJson}
                className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors"
              >
                {copied ? (
                  <Check className="h-3 w-3 text-emerald-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                {copied ? "Copied!" : "Copy JSON"}
              </button>
            </div>
            <pre className="text-[9px] bg-zinc-50 dark:bg-zinc-800 rounded-xl p-3 overflow-auto max-h-40 text-zinc-600 dark:text-zinc-400 font-mono leading-relaxed">
              {jsonOutput}
            </pre>
            <p className="text-[9px] text-zinc-400 dark:text-zinc-600 text-center">
              Paste this JSON into the layout constant in{" "}
              <span className="font-mono">src/lib/badgeLayout.ts</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
