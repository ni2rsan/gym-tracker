import type { UserBadge } from "@/core/constants/badges";
import type { PRRecord } from "./metrics";

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
  badges: UserBadge[];
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
