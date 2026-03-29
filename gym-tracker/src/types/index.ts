export type { MuscleGroup } from "@/constants/exercises";
import type { MuscleGroup } from "@/constants/exercises";

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

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface FriendSummary {
  friendshipId: string;
  userId: string;
  username: string | null;
  name: string | null;
  image: string | null;
  profileImageBase64: string | null;
}

export interface FriendProfileData {
  username: string;
  name: string | null;
  image: string | null;
  generalStreak: number;
  bestStreak: number;
  milestonesUnlocked: number[];
  totalWorkoutsThisMonth: number;
  totalWorkoutsAllTime: number;
  joinedAt: string; // ISO date string
  friendCount: number;
  fistbumpCount: number;
  cumulativeVolume: number;
  badges: import("@/constants/badges").UserBadge[];
  isAdmin: boolean;
  heightCm: number | null;
  weight: number | null;
  bodyFatPct: number | null;
  prs: PRRecord[];
  visibility: {
    canSeeWeight: boolean;
    canSeeBodyFat: boolean;
    canSeePRs: boolean;
  };
  myOverride: {
    shareWeight: boolean | null;
    shareBodyFat: boolean | null;
    sharePRs: boolean | null;
  };
}

export interface FeedExerciseSet {
  setNumber: number;
  reps: number;
  weightKg: number | null;
}

export interface FeedExercise {
  exerciseName: string;
  muscleGroup: string;
  sets: FeedExerciseSet[];
}

export interface WorkoutFeedEntry {
  sessionId: string;
  userId: string;
  username: string | null;
  name: string | null;
  image: string | null;
  date: string; // YYYY-MM-DD
  workoutType: string; // "Upper Body", "Lower Body", "Bodyweight", "Full Body", "Cardio", "Workout"
  exerciseCount: number;
  totalSets: number;
  prCount: number; // 0 if PRs not visible to viewer
  isOwnWorkout: boolean;
  fistBumps: { userId: string; name: string | null; username: string | null }[];
  myFistBump: boolean;
  exercises: FeedExercise[];
}

export interface NewFistBumpNotification {
  sessionId: string;
  bumperName: string | null;
  bumperUsername: string | null;
  bumperImage: string | null;
}

export interface SocialStats {
  totalFistBumpsReceived: number;
  totalWorkoutsTracked: number;
  friendCount: number;
}

export interface UserRequestItem {
  id: string;
  type: "BUG" | "FEATURE";
  status: "IN_REVIEW" | "ACCEPTED" | "DECLINED" | "DEPLOYED";
  text: string;
  screenshotBase64?: string | null;
  adminNote?: string | null;
  createdAt: string; // ISO string
  userName?: string;  // admin view only
  userEmail?: string; // admin view only
}
