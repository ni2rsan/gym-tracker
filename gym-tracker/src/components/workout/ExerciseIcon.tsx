import { Dumbbell, Bike } from "lucide-react";
import type { MuscleGroup } from "@/types";

// Exercise names that have a PNG in /public/exercises/
const EXERCISE_IMAGES = new Set([
  "ASSISTED DIPS",
  "ASSISTED PULLUPS",
  "BACK EXTENSION",
  "BENCH PRESS",
  "BICEPS CURL (DUMBBELL)",
  "BICEPS CURL (MACHINE)",
  "CABLE ROW",
  "CHEST PRESS",
  "CRUNCHES",
  "DEADLIFT",
  "HIP THRUST",
  "INCLINE PRESS",
  "LAT PULLDOWN",
  "LATERAL RAISE",
  "LEG EXTENSION",
  "LEG PRESS",
  "LEG RAISES",
  "LYING CURL",
  "PEC FLY",
  "PULLUPS",
  "PUSHUPS",
  "SEATED CALF EXTENSION",
  "SHOULDER PRESS",
  "SQUAT",
  "STANDING CALF EXTENSION",
  "TRICEPS PUSHDOWN",
  // Cardio
  "BIKING (MACHINE)",
  "BIKING (OUTDOOR)",
  "RUNNING (MACHINE)",
  "RUNNING (OUTDOOR)",
  "SWIMMING",
  "PADEL",
  "PICKLEBALL",
  "BADMINTON",
]);

const FALLBACK_ICONS: Record<MuscleGroup, React.ElementType> = {
  UPPER_BODY: Dumbbell,
  LOWER_BODY: Dumbbell,
  BODYWEIGHT: Dumbbell,
  CARDIO: Bike,
};

const MUSCLE_GROUP_COLORS: Record<MuscleGroup, string> = {
  UPPER_BODY: "text-blue-500 dark:text-blue-400",
  LOWER_BODY: "text-green-600 dark:text-green-400",
  BODYWEIGHT: "text-purple-500 dark:text-purple-400",
  CARDIO: "text-rose-500 dark:text-rose-400",
};

interface ExerciseIconProps {
  name: string;
  muscleGroup: MuscleGroup;
  className?: string;
}

export function ExerciseIcon({ name, muscleGroup, className }: ExerciseIconProps) {
  if (EXERCISE_IMAGES.has(name)) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={`/exercises/${name}.png`}
        alt={name}
        className={`object-contain ${className ?? "w-full h-full"}`}
      />
    );
  }

  const Icon = FALLBACK_ICONS[muscleGroup] ?? Dumbbell;
  const colorClass = MUSCLE_GROUP_COLORS[muscleGroup];
  return <Icon className={`h-4.5 w-4.5 ${colorClass} ${className ?? ""}`} strokeWidth={2} />;
}
