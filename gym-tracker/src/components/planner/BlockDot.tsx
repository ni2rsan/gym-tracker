import { BLOCK_COLORS, BLOCK_BORDER_COLORS, BLOCK_LABELS } from "@/constants/exercises";
import type { BlockType } from "@/constants/exercises";
import { cn } from "@/lib/utils";

interface BlockDotProps {
  blockType: string;
  size?: "sm" | "md" | "lg";
  status?: "tracked" | "missed";
}

export function BlockDot({ blockType, size = "sm", status }: BlockDotProps) {
  const sizeClass = size === "lg" ? "w-6 h-6" : size === "md" ? "w-5 h-5" : "w-4 h-4";
  const textSizeClass = size === "lg" ? "text-sm" : size === "md" ? "text-[11px]" : "text-[9px]";
  const title = BLOCK_LABELS[blockType as BlockType] ?? blockType;

  if (status === "tracked") {
    return (
      <span
        className={cn("inline-flex items-center justify-center rounded-full shrink-0 bg-amber-500 ring-2 ring-amber-300", sizeClass)}
        title={title}
      >
        <span className={cn("font-black leading-none text-white drop-shadow-sm", textSizeClass)}>✓</span>
      </span>
    );
  }

  if (status === "missed") {
    const borderColor = BLOCK_BORDER_COLORS[blockType as BlockType] ?? "border-zinc-400";
    return (
      <span
        className={cn("inline-flex items-center justify-center rounded-full shrink-0 border-2 bg-white dark:bg-zinc-900", sizeClass, borderColor)}
        title={title}
      >
        <span className={cn("font-bold leading-none", textSizeClass)} style={{ color: "#cc0000" }}>✗</span>
      </span>
    );
  }

  const color = BLOCK_COLORS[blockType as BlockType] ?? "bg-zinc-400";
  return (
    <span
      className={cn("inline-block rounded-full shrink-0", sizeClass, color)}
      title={title}
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
