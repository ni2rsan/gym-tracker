import { BLOCK_COLORS, BLOCK_LABELS } from "@/constants/exercises";
import type { BlockType } from "@/constants/exercises";
import { cn } from "@/lib/utils";

interface BlockDotProps {
  blockType: string;
  size?: "sm" | "md" | "lg";
}

export function BlockDot({ blockType, size = "sm" }: BlockDotProps) {
  const color = BLOCK_COLORS[blockType as BlockType] ?? "bg-zinc-400";
  return (
    <span
      className={cn(
        "inline-block rounded-full shrink-0",
        size === "lg" ? "w-3 h-3" : size === "md" ? "w-2.5 h-2.5" : "w-2 h-2",
        color
      )}
      title={BLOCK_LABELS[blockType as BlockType] ?? blockType}
    />
  );
}

export function BlockBadge({ blockType }: { blockType: string }) {
  const color = BLOCK_COLORS[blockType as BlockType] ?? "bg-zinc-400";
  const label = BLOCK_LABELS[blockType as BlockType] ?? blockType;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full text-white", color)}>
      {label}
    </span>
  );
}
