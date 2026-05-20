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
  fatMassKg: number | null;
  muscleMassKg: number | null;
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
  muscleGroup: string;
  maxWeightKg: number | null;
  repsAtMaxWeight: number | null;
  maxReps: number | null;
  achievedOn: string;
  isAssisted?: boolean;
}

export interface DashboardStats {
  lastWorkoutDate: string | null;
  totalSessions: number;
  currentWeightKg: number | null;
  currentBodyFatPct: number | null;
  recentPRs: PRRecord[];
}
