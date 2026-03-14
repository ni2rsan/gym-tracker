import {
  Dumbbell,
  ArrowUpFromLine,
  ArrowDownToLine,
  Waves,
  ChevronUp,
  Target,
  Zap,
  RotateCcw,
  PersonStanding,
  Timer,
  Bike,
  Footprints,
  MoveHorizontal,
} from "lucide-react";
import type { MuscleGroup } from "@/types";

const EXERCISE_ICONS: Record<string, React.ElementType> = {
  // ── Upper Body ──────────────────────────────────────────────────────────
  "BENCH PRESS":      Target,
  "INCLINE PRESS":    ArrowUpFromLine,
  "CHEST PRESS":      Target,
  "PEC DECK":         MoveHorizontal,
  "LAT PULLDOWN":     ArrowDownToLine,
  "ASSISTED PULLUPS": ArrowUpFromLine,
  "CABLE ROW":        Waves,
  "SUPPORTED ROW":    Waves,
  "BARBELL ROW":      Waves,
  "SHOULDER PRESS":   ChevronUp,
  "OVERHEAD PRESS":   ChevronUp,
  "LATERAL RAISE":    Zap,
  "ASSISTED DIPS":    ArrowDownToLine,
  "TRICEPS PUSHDOWN": ArrowDownToLine,
  "BICEPS MACHINE":   RotateCcw,

  // ── Lower Body ──────────────────────────────────────────────────────────
  "BACK SQUAT":        PersonStanding,
  "LEG PRESS":         ArrowUpFromLine,
  "ROMANIAN DEADLIFT": Dumbbell,
  "DEADLIFT":          Dumbbell,
  "HACK SQUAT":        PersonStanding,
  "SMITH SQUAT":       PersonStanding,
  "BULGARIAN SQUAT":   PersonStanding,
  "WALKING LUNGES":    Footprints,
  "HIP THRUST":        ChevronUp,
  "LEG EXTENSION":     ArrowUpFromLine,
  "SEATED CURL":       RotateCcw,
  "LYING CURL":        RotateCcw,
  "GLUTE DRIVE":       ChevronUp,
  "BACK EXTENSION":    RotateCcw,
  "STANDING CALVES":   ChevronUp,

  // ── Bodyweight ──────────────────────────────────────────────────────────
  "PUSHUPS":    Target,
  "PULLUPS":    ArrowUpFromLine,
  "CRUNCHES":   RotateCcw,
  "LEG RAISES": ArrowUpFromLine,

  // ── Cardio ───────────────────────────────────────────────────────────────
  "BIKING":      Bike,
  "JOGGING":     Footprints,
  "PADEL":       Zap,
  "PICKLEBALL":  Zap,
  "BADMINTON":   Zap,
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
  const Icon = EXERCISE_ICONS[name] ?? Dumbbell;
  const colorClass = MUSCLE_GROUP_COLORS[muscleGroup];
  return <Icon className={`h-4.5 w-4.5 ${colorClass} ${className ?? ""}`} strokeWidth={2} />;
}
