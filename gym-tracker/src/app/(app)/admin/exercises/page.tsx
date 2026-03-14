import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { Dumbbell } from "lucide-react";
import { ExerciseEditor } from "./ExerciseEditor";

export const metadata = { title: "Exercises — Admin" };
export const dynamic = "force-dynamic";

export default async function AdminExercisesPage() {
  await requireAdmin();

  const exercises = await prisma.exercise.findMany({
    orderBy: [{ muscleGroup: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, muscleGroup: true, isCompound: true, isDefault: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
          <Dumbbell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Exercises</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{exercises.length} exercises · click the pencil to rename</p>
        </div>
      </div>

      <ExerciseEditor exercises={exercises} />
    </div>
  );
}
