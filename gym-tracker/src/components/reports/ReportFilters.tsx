"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";
import type { TimeRange } from "@/types";

interface ReportFiltersProps {
  range: TimeRange;
}

const RANGES: { value: TimeRange; label: string }[] = [
  { value: "week", label: "7 Days" },
  { value: "month", label: "30 Days" },
  { value: "year", label: "1 Year" },
];

export function ReportFilters({ range }: ReportFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const setRange = (value: TimeRange) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", value);
    startTransition(() => router.push(`/reports?${params.toString()}`));
  };

  return (
    <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden w-fit">
      {RANGES.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => setRange(value)}
          className={cn(
            "px-3 py-1.5 text-xs font-medium transition-colors",
            range === value
              ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
              : "text-zinc-500 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
