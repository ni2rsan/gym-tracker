import { getCurrentUserId } from "@/lib/auth-helpers";
import { getActivityLog } from "@/lib/services/logService";
import { Trophy } from "lucide-react";
import { LogsList } from "@/components/logs/LogsList";
import type { SerializedLogEntry } from "@/components/logs/LogsList";

export const metadata = { title: "Logs — Gym Tracker" };
export const dynamic = "force-dynamic";

export default async function LogsPage() {
  const userId = await getCurrentUserId();
  const entries = await getActivityLog(userId);

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800 mb-4">
          <Trophy className="h-6 w-6 text-zinc-400" />
        </div>
        <p className="text-sm font-medium text-zinc-900 dark:text-white">No activity yet</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Save your first workout to start your log.
        </p>
      </div>
    );
  }

  // Serialize entries (Date → string) for client component boundary
  const serialized: SerializedLogEntry[] = entries.map((e) =>
    e.type === "workout"
      ? { ...e, timestamp: e.timestamp.toISOString(), workoutDate: e.workoutDate }
      : { ...e, timestamp: e.timestamp.toISOString() }
  );

  const workoutCount = entries.filter((e) => e.type === "workout").length;
  const metricCount = entries.filter((e) => e.type === "metric").length;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Summary bar */}
      <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
        <span>
          <span className="font-semibold text-zinc-900 dark:text-white">{workoutCount}</span>{" "}
          {workoutCount === 1 ? "workout" : "workouts"}
        </span>
        <span className="w-px h-3 bg-zinc-200 dark:bg-zinc-700" />
        <span>
          <span className="font-semibold text-zinc-900 dark:text-white">{metricCount}</span>{" "}
          metric {metricCount === 1 ? "entry" : "entries"}
        </span>
      </div>

      {/* Timeline groups */}
      <LogsList initialEntries={serialized} />
    </div>
  );
}
