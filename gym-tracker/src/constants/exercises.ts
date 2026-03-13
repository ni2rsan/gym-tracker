// MuscleGroup as plain JS object — safe for client components (no Prisma imports)
export const MuscleGroup = {
  UPPER_BODY: "UPPER_BODY",
  LOWER_BODY: "LOWER_BODY",
  BODYWEIGHT: "BODYWEIGHT",
  CARDIO: "CARDIO",
} as const;

export type MuscleGroup = (typeof MuscleGroup)[keyof typeof MuscleGroup];

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  UPPER_BODY: "Upper Body",
  LOWER_BODY: "Lower Body",
  BODYWEIGHT: "Bodyweight",
  CARDIO: "Cardio",
};

export const MUSCLE_GROUP_ORDER: MuscleGroup[] = [
  MuscleGroup.UPPER_BODY,
  MuscleGroup.LOWER_BODY,
  MuscleGroup.BODYWEIGHT,
  MuscleGroup.CARDIO,
];

export const DEFAULT_SETS = 3;

// BlockType — client-safe (no Prisma imports)
export const BlockType = {
  UPPER_BODY: "UPPER_BODY",
  LOWER_BODY: "LOWER_BODY",
  BODYWEIGHT: "BODYWEIGHT",
  FULL_BODY: "FULL_BODY",
  CARDIO: "CARDIO",
} as const;

export type BlockType = (typeof BlockType)[keyof typeof BlockType];

export const BLOCK_LABELS: Record<BlockType, string> = {
  UPPER_BODY: "Upper Body",
  LOWER_BODY: "Lower Body",
  BODYWEIGHT: "Bodyweight",
  FULL_BODY: "Full Body",
  CARDIO: "Cardio",
};

// Tailwind bg color classes for dots and backgrounds
export const BLOCK_COLORS: Record<BlockType, string> = {
  UPPER_BODY: "bg-blue-300",
  LOWER_BODY: "bg-green-300",
  BODYWEIGHT: "bg-purple-300",
  FULL_BODY: "bg-stone-400",
  CARDIO: "bg-rose-300",
};

// Border color classes for outlined dots (used when showing status)
export const BLOCK_BORDER_COLORS: Record<BlockType, string> = {
  UPPER_BODY: "border-blue-300",
  LOWER_BODY: "border-green-300",
  BODYWEIGHT: "border-purple-300",
  FULL_BODY: "border-stone-400",
  CARDIO: "border-rose-300",
};

// Text color classes
export const BLOCK_TEXT_COLORS: Record<BlockType, string> = {
  UPPER_BODY: "text-blue-600 dark:text-blue-400",
  LOWER_BODY: "text-amber-600 dark:text-amber-400",
  BODYWEIGHT: "text-purple-600 dark:text-purple-400",
  FULL_BODY: "text-purple-600 dark:text-purple-400",
  CARDIO: "text-rose-600 dark:text-rose-400",
};

// Light bg classes for badges/chips
export const BLOCK_BG_LIGHT: Record<BlockType, string> = {
  UPPER_BODY: "bg-blue-50 dark:bg-blue-900/20",
  LOWER_BODY: "bg-amber-50 dark:bg-amber-900/20",
  BODYWEIGHT: "bg-purple-50 dark:bg-purple-900/20",
  FULL_BODY: "bg-purple-50 dark:bg-purple-900/20",
  CARDIO: "bg-rose-50 dark:bg-rose-900/20",
};
