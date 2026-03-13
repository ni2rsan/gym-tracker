export type { MuscleGroup } from "@/constants/exercises";
import type { MuscleGroup } from "@/constants/exercises";

export interface ExerciseWithSettings {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  isDefault: boolean;
  isBodyweight: boolean;
  sortOrder: number;
  isPinned: boolean;
  userSortOrder: number;
  preferredSets?: number | null;
}

export interface SetData {
  setNumber: number;
  reps: number | string;
  weightKg: number | string;
}

export interface ExerciseInput {
  exerciseId: string;
  sets: SetData[];
}

export interface WorkoutFormData {
  date: string; // ISO date string YYYY-MM-DD
  exercises: ExerciseInput[];
}

export interface BodyMetricFormData {
  weightKg?: number | string;
  bodyFatPct?: number | string;
  notes?: string;
}

export type TimeRange = "week" | "month" | "year";

export interface MetricPoint {
  date: string;
  weightKg: number | null;
  bodyFatPct: number | null;
}

export interface ExerciseProgressPoint {
  date: string;
  maxWeight: number | null;
  maxReps: number | null;
  totalVolume: number | null;
}

export interface PRRecord {
  exerciseId: string;
  exerciseName: string;
  maxWeightKg: number | null;
  repsAtMaxWeight: number | null;
  maxReps: number | null;
  achievedOn: string;
}

export interface DashboardStats {
  lastWorkoutDate: string | null;
  totalSessions: number;
  currentWeightKg: number | null;
  currentBodyFatPct: number | null;
  recentPRs: PRRecord[];
}

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}
