"use client";

import { useEffect, useRef, useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Pencil, Trash2, Activity, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { BLOCK_LABELS, BLOCK_TEXT_COLORS, BLOCK_BG_LIGHT } from "@/constants/exercises";
import type { BlockType } from "@/constants/exercises";
import { deleteBlock, deleteSeries, updateBlock } from "@/actions/planner";
import type { PlannedBlock } from "./WorkoutCalendar";
import { BlockBadge } from "./BlockDot";
import { AddBlockModal } from "./AddBlockModal";

interface DayContextMenuProps {
  date: string;
  blocks: PlannedBlock[];
  x: number;
  y: number;
  workedOut: boolean;
  onClose: () => void;
  onBlockDeleted: (blockId: string) => void;
  onSeriesDeleted: (seriesId: string) => void;
  onBlockUpdated: (blockId: string, blockType: string) => void;
  onSeriesUpdated: (seriesId: string, blocks: PlannedBlock[]) => void;
  onAddBlock: () => void;
}

export function DayContextMenu({
  date,
  blocks,
  x,
  y,
  workedOut,
  onClose,
  onBlockDeleted,
  onSeriesDeleted,
  onBlockUpdated,
  onSeriesUpdated,
  onAddBlock,
}: DayContextMenuProps) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();
  const [activeBlock, setActiveBlock] = useState<PlannedBlock>(blocks[0]);
  const [editMode, setEditMode] = useState<"block" | "series" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<"block" | "series" | null>(null);

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

  const d = new Date(date + "T12:00:00");
  const dateLabel = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

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
    router.push(`/workout?date=${date}`);
  };

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
        <div>
          <p suppressHydrationWarning className="text-xs text-zinc-500 dark:text-zinc-400">{dateLabel}</p>
          {workedOut && (
            <span className="text-xs text-emerald-500 font-medium">✓ Workout tracked</span>
          )}
        </div>
        <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
          <X className="h-4 w-4" />
        </button>
      </div>

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
          <div className="px-4 py-2 flex items-center gap-2">
            <span className="text-xs text-zinc-500 flex-1">Delete this block?</span>
            <button
              onClick={() => handleDeleteBlock(activeBlock.id)}
              disabled={isPending}
              className="text-xs text-red-500 font-semibold hover:text-red-600"
            >
              Yes
            </button>
            <button onClick={() => setConfirmDelete(null)} className="text-xs text-zinc-400">No</button>
          </div>
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
      </div>
    </div>
  );
}
