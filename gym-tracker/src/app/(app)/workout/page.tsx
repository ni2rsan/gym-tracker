import { getCurrentUserId } from "@/lib/auth-helpers";
import { getExercisesForUser } from "@/lib/services/exerciseService";
import { WorkoutForm } from "@/components/workout/WorkoutForm";

export const metadata = { title: "Workout Tracker — Gym Tracker" };
export const dynamic = "force-dynamic";

export default async function WorkoutPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const initialDate =
    params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : undefined;

  const userId = await getCurrentUserId();
  const exercises = await getExercisesForUser(userId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Workout Tracker</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
          Log your sets and track your progress.
        </p>
      </div>

      <WorkoutForm initialExercises={exercises} initialDate={initialDate} />
    </div>
  );
}
