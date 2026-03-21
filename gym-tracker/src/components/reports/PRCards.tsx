import { Trophy } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { formatDate } from "@/lib/utils";
import type { PRRecord } from "@/types";

interface PRCardsProps {
  prs: PRRecord[];
}

export function PRCards({ prs }: PRCardsProps) {
  if (prs.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-zinc-400 dark:text-zinc-500">
        Complete workouts to see your personal records here.
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {prs.map((pr) => (
        <Card key={pr.exerciseId}>
          <CardBody className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Trophy className="h-4 w-4 text-amber-500 dark:text-amber-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                {pr.exerciseName}
              </p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {pr.maxWeightKg != null
                  ? `${Number(pr.maxWeightKg).toFixed(1)} kg × ${pr.repsAtMaxWeight} reps`
                  : `${pr.maxReps} reps`}
              </p>
              {pr.isAssisted && (
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500">↓ lower = better</p>
              )}
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                {formatDate(pr.achievedOn)}
              </p>
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
