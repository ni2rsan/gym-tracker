// MuscleGroup as plain JS object — safe for client components (no Prisma imports)
export const MuscleGroup = {
  UPPER_BODY: "UPPER_BODY",
  LOWER_BODY: "LOWER_BODY",
  BODYWEIGHT: "BODYWEIGHT",
} as const;

export type MuscleGroup = (typeof MuscleGroup)[keyof typeof MuscleGroup];

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  UPPER_BODY: "Upper Body",
  LOWER_BODY: "Lower Body",
  BODYWEIGHT: "Bodyweight",
};

export const MUSCLE_GROUP_ORDER: MuscleGroup[] = [
  MuscleGroup.UPPER_BODY,
  MuscleGroup.LOWER_BODY,
  MuscleGroup.BODYWEIGHT,
];

export const DEFAULT_SETS = 3;
