import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "emerald" | "blue" | "amber" | "purple";
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        {
          "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400": variant === "default",
          "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400": variant === "emerald",
          "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400": variant === "blue",
          "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400": variant === "amber",
          "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400": variant === "purple",
        },
        className
      )}
    >
      {children}
    </span>
  );
}
