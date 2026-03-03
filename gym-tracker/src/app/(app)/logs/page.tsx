import { getCurrentUserId } from "@/lib/auth-helpers";
import { getActivityLog } from "@/lib/services/logService";
import { Dumbbell, Scale, Trophy } from "lucide-react";
import type { LogEntry } from "@/lib/services/logService";

export const metadata = { title: "Logs — Gym Tracker" };
export const dynamic = "force-dynamic";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(date: Date) {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatWorkoutDate(isoDate: string) {
  const d = new Date(isoDate + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

function getDayLabel(date: Date) {
  const now = new Date();
  const d = new Date(date);
  const diffDays = Math.floor(
    (Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) -
      Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())) /
      86_400_000
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function getDayKey(date: Date) {
  return new Date(date).toISOString().split("T")[0];
}

function formatKg(val: number | null) {
  if (val === null) return null;
  return val % 1 === 0 ? `${val}` : val.toFixed(1);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function WorkoutEntry({ entry }: { entry: Extract<LogEntry, { type: "workout" }> }) {
  return (
    <div className="group relative flex gap-4">
      {/* Icon */}
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:ring-emerald-800/50">
        <Dumbbell className="h-4 w-4" strokeWidth={2.5} />
      </div>

      {/* Card */}
      <div className="flex-1 min-w-0 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-white">
              Workout
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {formatWorkoutDate(entry.workoutDate)}
            </p>
          </div>
          <time className="shrink-0 text-xs tabular-nums text-zinc-400 dark:text-zinc-500 mt-0.5">
            {formatTime(entry.timestamp)}
          </time>
        </div>

        {/* Exercise rows */}
        <div className="space-y-2">
          {entry.exercises.map((ex) => (
            <div key={ex.exerciseId} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-xs font-semibold tracking-wide text-zinc-700 dark:text-zinc-300 uppercase shrink-0">
                {ex.name}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {ex.sets.map((s) => (
                  <span
                    key={s.setNumber}
                    className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                  >
                    <span className="font-medium text-zinc-400 dark:text-zinc-500">
                      S{s.setNumber}
                    </span>
                    {ex.isBodyweight ? (
                      <span>{s.reps} reps</span>
                    ) : (
                      <span>
                        {s.reps}r
                        {s.weightKg !== null && (
                          <> · <span className="text-emerald-600 dark:text-emerald-400 font-medium">{formatKg(s.weightKg)} kg</span></>
                        )}
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricEntry({ entry }: { entry: Extract<LogEntry, { type: "metric" }> }) {
  const hasWeight = entry.weightKg !== null;
  const hasBodyFat = entry.bodyFatPct !== null;

  return (
    <div className="group relative flex gap-4">
      {/* Icon */}
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:ring-blue-800/50">
        <Scale className="h-4 w-4" strokeWidth={2.5} />
      </div>

      {/* Card */}
      <div className="flex-1 min-w-0 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-zinc-900 dark:text-white mb-2">
              Body Metrics
            </p>
            <div className="flex flex-wrap gap-3">
              {hasWeight && (
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">Weight</span>
                  <span className="text-sm font-bold text-zinc-900 dark:text-white">
                    {formatKg(entry.weightKg)}
                    <span className="text-xs font-normal text-zinc-400 ml-0.5">kg</span>
                  </span>
                </div>
              )}
              {hasBodyFat && (
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">Body Fat</span>
                  <span className="text-sm font-bold text-zinc-900 dark:text-white">
                    {formatKg(entry.bodyFatPct)}
                    <span className="text-xs font-normal text-zinc-400 ml-0.5">%</span>
                  </span>
                </div>
              )}
            </div>
            {entry.notes && (
              <p className="mt-1.5 text-xs text-zinc-400 dark:text-zinc-500 italic">
                {entry.notes}
              </p>
            )}
          </div>
          <time className="shrink-0 text-xs tabular-nums text-zinc-400 dark:text-zinc-500 mt-0.5">
            {formatTime(entry.timestamp)}
          </time>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

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

  // Group entries by calendar day
  const groups: { label: string; key: string; entries: LogEntry[] }[] = [];
  const seenKeys = new Set<string>();

  for (const entry of entries) {
    const key = getDayKey(entry.timestamp);
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      groups.push({ label: getDayLabel(entry.timestamp), key, entries: [] });
    }
    groups[groups.length - 1].entries.push(entry);
  }

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
      {groups.map((group) => (
        <div key={group.key}>
          {/* Date label */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest shrink-0">
              {group.label}
            </span>
            <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
          </div>

          {/* Entries with connector line */}
          <div className="relative space-y-3 pl-0">
            {/* Vertical connector between items */}
            {group.entries.length > 1 && (
              <div
                className="absolute left-[17px] top-9 bottom-9 w-px bg-zinc-200 dark:bg-zinc-800 -z-10"
                aria-hidden
              />
            )}
            {group.entries.map((entry) =>
              entry.type === "workout" ? (
                <WorkoutEntry key={entry.id} entry={entry} />
              ) : (
                <MetricEntry key={entry.id} entry={entry} />
              )
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
