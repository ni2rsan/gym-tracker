"use client";

import { useEffect, useRef, useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Pencil, Trash2, Activity, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { BLOCK_LABELS } from "@/constants/exercises";
import type { BlockType } from "@/constants/exercises";
import {
  deleteBlock,
  deleteSeries,
  applySorryDeleteBlock,
  deleteBlockResetStreak,
} from "@/actions/planner";
import { deleteWorkoutSessionByDate, getWorkoutSummaryForDate } from "@/actions/workout";
import type { WorkoutExerciseSummary } from "@/lib/services/workoutService";
import type { PlannedBlock } from "./WorkoutCalendar";
import { BlockBadge } from "./BlockDot";
import { AddBlockModal } from "./AddBlockModal";

interface DayContextMenuProps {
  date: string;
  blocks: PlannedBlock[];
  x: number;
  y: number;
  workedOut: boolean;
  trackedGroupsForDate?: string[];
  onClose: () => void;
  onBlockDeleted: (blockId: string) => void;
  onSeriesDeleted: (seriesId: string) => void;
  onBlockUpdated: (blockId: string, blockType: string) => void;
  onSeriesUpdated: (seriesId: string, blocks: PlannedBlock[]) => void;
  onAddBlock: () => void;
  onWorkedOutDeleted?: (date: string) => void;
  /** Streak count per seriesId (from streakData) */
  streakBySeriesId?: Record<string, number>;
  /** SORRY tokens remaining this month */
  sorryRemaining?: number;
}

function isBlockTracked(groups: Set<string> | undefined, blockType: string): boolean {
  if (!groups || groups.size === 0) return false;
  if (blockType === "FULL_BODY") return groups.has("UPPER_BODY") || groups.has("LOWER_BODY") || groups.has("BODYWEIGHT");
  if (blockType === "CARDIO") return groups.has("CARDIO");
  return groups.has(blockType);
}

export function DayContextMenu({
  date,
  blocks,
  x,
  y,
  workedOut,
  trackedGroupsForDate,
  onClose,
  onBlockDeleted,
  onSeriesDeleted,
  onBlockUpdated,
  onSeriesUpdated,
  onAddBlock,
  onWorkedOutDeleted,
  streakBySeriesId = {},
  sorryRemaining = 3,
}: DayContextMenuProps) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();
  const [activeBlock, setActiveBlock] = useState<PlannedBlock>(blocks[0]);
  const [editMode, setEditMode] = useState<"block" | "series" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<"block" | "series" | "workout" | null>(null);
  const [workoutSummary, setWorkoutSummary] = useState<WorkoutExerciseSummary[]>([]);

  useEffect(() => {
    if (!workedOut) return;
    getWorkoutSummaryForDate(date).then((result) => {
      if (result.success && result.data) setWorkoutSummary(result.data);
    });
  }, [date, workedOut]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  // Position: keep in viewport
  const [pos, setPos] = useState({ top: y, left: x });
  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let top = y;
    let left = x;
    if (left + rect.width > vw - 8) left = vw - rect.width - 8;
    if (top + rect.height > vh - 8) top = Math.max(8, y - rect.height);
    setPos({ top, left });
  }, [x, y]);

  // Streak for the currently active block's series
  const seriesStreak = activeBlock.seriesId ? (streakBySeriesId[activeBlock.seriesId] ?? 0) : 0;

  // Block-type-aware tracking check (recomputes when activeBlock changes)
  const isActiveBlockTracked = isBlockTracked(
    trackedGroupsForDate ? new Set(trackedGroupsForDate) : undefined,
    activeBlock.blockType
  );

  const d = new Date(date + "T12:00:00");
  const dateLabel = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  // Non-series block: simple delete
  const handleDeleteBlock = (blockId: string) => {
    startTransition(async () => {
      const result = await deleteBlock(blockId);
      if (result.success) {
        onBlockDeleted(blockId);
        if (blocks.length === 1) onClose();
        else setActiveBlock(blocks.find(b => b.id !== blockId) ?? blocks[0]);
      }
    });
  };

  // Series block: delete with streak reset
  const handleDeleteBlockWithReset = (blockId: string) => {
    startTransition(async () => {
      const result = await deleteBlockResetStreak(blockId);
      if (result.success) {
        onBlockDeleted(blockId);
        if (blocks.length === 1) onClose();
        else setActiveBlock(blocks.find(b => b.id !== blockId) ?? blocks[0]);
      }
    });
  };

  // Series block: soft-delete via SORRY token
  const handleDeleteBlockWithSorry = (blockId: string) => {
    startTransition(async () => {
      const result = await applySorryDeleteBlock(blockId);
      if (result.success) {
        onBlockDeleted(blockId);
        if (blocks.length === 1) onClose();
        else setActiveBlock(blocks.find(b => b.id !== blockId) ?? blocks[0]);
      }
    });
  };

  const handleDeleteSeries = (seriesId: string) => {
    startTransition(async () => {
      const result = await deleteSeries(seriesId);
      if (result.success) {
        onSeriesDeleted(seriesId);
        onClose();
      }
    });
  };

  const handleTrack = () => {
    onClose();
    router.push(`/workout?date=${date}&section=${activeBlock.blockType}`);
  };

  const handleDeleteTrackedWorkout = () => {
    startTransition(async () => {
      const result = await deleteWorkoutSessionByDate(date);
      if (result.success) {
        onWorkedOutDeleted?.(date);
        onClose();
      }
    });
  };

  const hasStreak = activeBlock.seriesId && seriesStreak > 0;

  if (editMode === "block" || editMode === "series") {
    return (
      <AddBlockModal
        date={date}
        onClose={() => { setEditMode(null); onClose(); }}
        onBlockAdded={() => {}}
        onBlocksAdded={() => {}}
        editBlockId={editMode === "block" ? activeBlock.id : undefined}
        editSeriesId={editMode === "series" ? (activeBlock.seriesId ?? undefined) : undefined}
        initialBlockType={activeBlock.blockType}
        seriesStreak={editMode === "series" ? seriesStreak : 0}
        sorryRemaining={editMode === "series" ? sorryRemaining : 3}
      />
    );
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-72 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden"
      style={{ top: pos.top, left: pos.left }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
        <div className="min-w-0 flex-1">
          <p suppressHydrationWarning className="text-xs text-zinc-500 dark:text-zinc-400">{dateLabel}</p>
          {isActiveBlockTracked && (
            <span className="text-xs text-emerald-500 font-medium">✓ Workout tracked</span>
          )}
        </div>
        <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Workout exercise summary — filtered to match the active block type */}
      {workedOut && workoutSummary.length > 0 && (() => {
        const bt = activeBlock.blockType;
        const filtered = workoutSummary.filter((ex) => {
          if (bt === "FULL_BODY") return !ex.isCardio;
          if (bt === "CARDIO") return ex.isCardio;
          return ex.muscleGroup === bt;
        });
        if (filtered.length === 0) return null;
        return (
        <div className="px-4 py-2 border-b border-zinc-100 dark:border-zinc-800 flex flex-wrap gap-1">
          {filtered.map((ex) => {
            const metric = ex.isCardio
              ? `${ex.minutes}m`
              : !ex.isBodyweight && ex.maxKg !== null
              ? `${ex.maxKg % 1 === 0 ? ex.maxKg : ex.maxKg.toFixed(1)}kg`
              : null;
            return (
              <span
                key={ex.name}
                className="inline-flex items-center gap-1 rounded-md bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-600 dark:text-zinc-400"
              >
                <span className="font-medium">{ex.name}</span>
                {metric && (
                  <span className={ex.isCardio ? "text-rose-500 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}>
                    · {metric}
                  </span>
                )}
              </span>
            );
          })}
        </div>
        );
      })()}

      {/* Block selector if multiple blocks */}
      {blocks.length > 1 && (
        <div className="px-4 py-2 flex gap-2 flex-wrap border-b border-zinc-100 dark:border-zinc-800">
          {blocks.map(b => (
            <button
              key={b.id}
              onClick={() => setActiveBlock(b)}
              className={cn(
                "rounded-lg px-2 py-1 text-xs font-medium border transition-colors",
                activeBlock.id === b.id
                  ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"
                  : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300"
              )}
            >
              {BLOCK_LABELS[b.blockType as BlockType] ?? b.blockType}
            </button>
          ))}
        </div>
      )}

      {/* Active block info */}
      <div className="px-4 py-2 border-b border-zinc-100 dark:border-zinc-800">
        <BlockBadge blockType={activeBlock.blockType} />
        {activeBlock.seriesId && (
          <span className="ml-2 text-xs text-zinc-400">Recurring</span>
        )}
      </div>

      {/* Actions */}
      <div className="py-1">
        {/* Edit block */}
        <button
          onClick={() => setEditMode("block")}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-left"
        >
          <Pencil className="h-4 w-4 text-zinc-400" />
          Edit block
        </button>

        {/* Edit series */}
        {activeBlock.seriesId && (
          <button
            onClick={() => setEditMode("series")}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-left"
          >
            <Pencil className="h-4 w-4 text-zinc-400" />
            Edit series
          </button>
        )}

        {/* Delete block */}
        {confirmDelete === "block" ? (
          activeBlock.seriesId && hasStreak ? (
            /* Series block with streak: SORRY dialog */
            <div className="px-4 py-3 space-y-2 border-t border-zinc-100 dark:border-zinc-800">
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-snug">
                This will reset your <span className="font-bold text-amber-500">{seriesStreak}-day streak</span>.
              </p>
              <div className="flex flex-col gap-1.5">
                {sorryRemaining > 0 ? (
                  <button
                    onClick={() => handleDeleteBlockWithSorry(activeBlock.id)}
                    disabled={isPending}
                    className="w-full rounded-lg px-3 py-1.5 text-xs font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
                  >
                    🛡️ Use SORRY Token ({sorryRemaining} left) — Keep Streak
                  </button>
                ) : (
                  <p className="text-xs text-zinc-400 italic text-center">No SORRY tokens left this month</p>
                )}
                <button
                  onClick={() => handleDeleteBlockWithReset(activeBlock.id)}
                  disabled={isPending}
                  className="w-full rounded-lg px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border border-red-200 dark:border-red-900/40"
                >
                  Delete &amp; Reset Streak
                </button>
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="text-xs text-zinc-400 hover:text-zinc-600 text-center"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            /* Non-series block or no streak: simple confirm */
            <div className="px-4 py-2 flex items-center gap-2">
              <span className="text-xs text-zinc-500 flex-1">Delete this block?</span>
              <button
                onClick={() => activeBlock.seriesId
                  ? handleDeleteBlockWithReset(activeBlock.id)
                  : handleDeleteBlock(activeBlock.id)
                }
                disabled={isPending}
                className="text-xs text-red-500 font-semibold hover:text-red-600"
              >
                Yes
              </button>
              <button onClick={() => setConfirmDelete(null)} className="text-xs text-zinc-400">No</button>
            </div>
          )
        ) : (
          <button
            onClick={() => setConfirmDelete("block")}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left"
          >
            <Trash2 className="h-4 w-4" />
            Delete block
          </button>
        )}

        {/* Delete series */}
        {activeBlock.seriesId && (
          confirmDelete === "series" ? (
            <div className="px-4 py-2 flex items-center gap-2">
              <span className="text-xs text-zinc-500 flex-1">Delete entire series?</span>
              <button
                onClick={() => handleDeleteSeries(activeBlock.seriesId!)}
                disabled={isPending}
                className="text-xs text-red-500 font-semibold hover:text-red-600"
              >
                Yes
              </button>
              <button onClick={() => setConfirmDelete(null)} className="text-xs text-zinc-400">No</button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete("series")}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left"
            >
              <Trash2 className="h-4 w-4" />
              Delete series
            </button>
          )
        )}

        {/* Add another block */}
        <button
          onClick={onAddBlock}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-left border-t border-zinc-100 dark:border-zinc-800"
        >
          <Plus className="h-4 w-4 text-zinc-400" />
          Add another block
        </button>

        {/* TRACK — hidden for Cardio */}
        {activeBlock.blockType !== "CARDIO" && (
          <button
            onClick={handleTrack}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors text-left border-t border-zinc-100 dark:border-zinc-800"
          >
            <Activity className="h-4 w-4" />
            Track workout →
          </button>
        )}

        {/* Delete tracked workout */}
        {workedOut && (
          confirmDelete === "workout" ? (
            <div className="px-4 py-2 flex items-center gap-2 border-t border-zinc-100 dark:border-zinc-800">
              <span className="text-xs text-zinc-500 flex-1">Delete tracked workout?</span>
              <button
                onClick={handleDeleteTrackedWorkout}
                disabled={isPending}
                className="text-xs text-red-500 font-semibold hover:text-red-600"
              >
                Yes
              </button>
              <button onClick={() => setConfirmDelete(null)} className="text-xs text-zinc-400">No</button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete("workout")}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left border-t border-zinc-100 dark:border-zinc-800"
            >
              <Trash2 className="h-4 w-4" />
              Delete tracked workout
            </button>
          )
        )}
      </div>
    </div>
  );
}
