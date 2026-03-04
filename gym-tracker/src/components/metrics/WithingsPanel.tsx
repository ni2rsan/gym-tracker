"use client";

import { useTransition } from "react";
import { Cloud, CloudOff, RefreshCw } from "lucide-react";
import { disconnectWithings } from "@/actions/withings";

interface MetricEntry {
  id: string;
  weightKg: string | null;
  bodyFatPct: string | null;
  recordedAt: string;
  source: string | null;
}

interface WithingsPanelProps {
  isConnected: boolean;
  lastSyncAt: string | null;
  recentEntries: MetricEntry[];
  withingsError?: string | null;
}

export function WithingsPanel({
  isConnected,
  lastSyncAt,
  recentEntries,
  withingsError,
}: WithingsPanelProps) {
  const [isPending, startTransition] = useTransition();

  const handleDisconnect = () => {
    startTransition(async () => {
      await disconnectWithings();
      window.location.reload();
    });
  };

  if (!isConnected) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Cloud className="h-4 w-4 text-zinc-400" />
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            Sync body metrics from Withings
          </span>
        </div>
        <a
          href="/api/withings/connect"
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
        >
          Connect Withings →
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <Cloud className="h-4 w-4 text-emerald-500" />
          <span className="text-sm font-medium text-zinc-900 dark:text-white">
            Withings connected
          </span>
          {withingsError && (
            <span className="text-xs text-red-500 ml-1">· sync error</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {lastSyncAt && (
            <span suppressHydrationWarning className="text-xs text-zinc-400 dark:text-zinc-500 flex items-center gap-1">
              <RefreshCw className="h-3 w-3" />
              {new Date(lastSyncAt).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          )}
          <button
            onClick={handleDisconnect}
            disabled={isPending}
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-50"
          >
            <CloudOff className="h-3.5 w-3.5" />
            Disconnect
          </button>
        </div>
      </div>

      {/* Last 7 measurements */}
      {recentEntries.length === 0 ? (
        <div className="px-4 py-4 text-sm text-zinc-400 dark:text-zinc-500">
          No measurements synced yet. Sync happens automatically on page load.
        </div>
      ) : (
        <>
          {/* Column headers */}
          <div className="flex items-center px-4 py-1.5 gap-4 bg-zinc-50 dark:bg-zinc-800/30 border-b border-zinc-100 dark:border-zinc-800 text-xs text-zinc-400 dark:text-zinc-500">
            <span className="w-28 shrink-0">Date</span>
            <span className="flex-1">Weight</span>
            <span className="flex-1">Body Fat</span>
            <span className="w-16 text-right">Source</span>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {recentEntries.map((entry) => {
              const isWithings = entry.source === "withings";
              return (
                <div
                  key={entry.id}
                  className="flex items-center px-4 py-2.5 gap-4 text-sm"
                >
                  <span suppressHydrationWarning className="w-28 shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
                    {new Date(entry.recordedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  <span className="flex-1 font-medium text-zinc-800 dark:text-zinc-200">
                    {entry.weightKg ? `${Number(entry.weightKg).toFixed(1)} kg` : "—"}
                  </span>
                  <span className="flex-1 font-medium text-zinc-800 dark:text-zinc-200">
                    {entry.bodyFatPct ? `${Number(entry.bodyFatPct).toFixed(1)}%` : "—"}
                  </span>
                  <div className="w-16 flex justify-end">
                    {isWithings ? (
                      <span
                        title="Synced from Withings"
                        className="flex items-center gap-1 text-xs text-emerald-500"
                      >
                        <Cloud className="h-3 w-3" />
                        Withings
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-400">Manual</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
