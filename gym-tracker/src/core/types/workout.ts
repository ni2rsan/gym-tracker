import type { MuscleGroup } from "@/core/constants/exercises";

export interface ExerciseWithSettings {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  isDefault: boolean;
  isBodyweight: boolean;
  isCompound: boolean;
  sortOrder: number;
  isPinned: boolean;
  userSortOrder: number;
  preferredSets?: number | null;
  createdByUserId: string | null;
  isOwnedAndDeletable: boolean;
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
