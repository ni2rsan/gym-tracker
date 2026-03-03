import {
  Dumbbell,
  ArrowUpFromLine,
  ArrowDownToLine,
  Waves,
  ChevronUp,
  Target,
  Zap,
  Circle,
  RotateCcw,
  PersonStanding,
} from "lucide-react";
import type { MuscleGroup } from "@/types";

const EXERCISE_ICONS: Record<string, React.ElementType> = {
  "LAT PULL": ArrowDownToLine,
  "TRICEPS PUSH": ArrowUpFromLine,
  "ROWING PULL": Waves,
  "SHOULDER PRESS": ChevronUp,
  "CHEST PRESS": Target,
  "LATERAL RAISE": Zap,
  "BICEPS CURLS": Circle,
  "BICEPS DUMBBELL": Dumbbell,
  "PEC FLY": Waves,
  "SQUATS": PersonStanding,
  "LEG PUSH": ArrowUpFromLine,
  "LEG PULL": ArrowDownToLine,
  "CALF EXTENSION": ChevronUp,
  "BACK EXTENSION": RotateCcw,
  "PUSHUPS": Target,
  "PULLUPS": ArrowUpFromLine,
};

const MUSCLE_GROUP_COLORS: Record<MuscleGroup, string> = {
  UPPER_BODY: "text-blue-500 dark:text-blue-400",
  LOWER_BODY: "text-amber-500 dark:text-amber-400",
  BODYWEIGHT: "text-purple-500 dark:text-purple-400",
};

interface ExerciseIconProps {
  name: string;
  muscleGroup: MuscleGroup;
  className?: string;
}

export function ExerciseIcon({ name, muscleGroup, className }: ExerciseIconProps) {
  const Icon = EXERCISE_ICONS[name] ?? Dumbbell;
  const colorClass = MUSCLE_GROUP_COLORS[muscleGroup];
  return <Icon className={`h-4.5 w-4.5 ${colorClass} ${className ?? ""}`} strokeWidth={2} />;
}
