import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, MuscleGroup } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// Exercises with stable IDs. Renamed exercises keep their old ID so existing
// workout history is preserved; only the display name changes via the upsert update.
const DEFAULT_EXERCISES: {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  isBodyweight: boolean;
  isCompound: boolean;
  sortOrder: number;
}[] = [
  // ── Upper Body ──────────────────────────────────────────────────────────
  // Compounds
  { id: "default-bench-press",     name: "BENCH PRESS",      muscleGroup: MuscleGroup.UPPER_BODY, isBodyweight: false, isCompound: true,  sortOrder: 1 },
  { id: "default-incline-press",   name: "INCLINE PRESS",    muscleGroup: MuscleGroup.UPPER_BODY, isBodyweight: false, isCompound: true,  sortOrder: 2 },
  { id: "default-chest-press",     name: "CHEST PRESS",      muscleGroup: MuscleGroup.UPPER_BODY, isBodyweight: false, isCompound: true,  sortOrder: 3 },
  { id: "default-lat-pull",        name: "LAT PULLDOWN",     muscleGroup: MuscleGroup.UPPER_BODY, isBodyweight: false, isCompound: true,  sortOrder: 4 },
  { id: "default-assisted-pullups",name: "ASSISTED PULLUPS", muscleGroup: MuscleGroup.UPPER_BODY, isBodyweight: false, isCompound: true,  sortOrder: 5 },
  { id: "default-rowing-pull",     name: "CABLE ROW",        muscleGroup: MuscleGroup.UPPER_BODY, isBodyweight: false, isCompound: true,  sortOrder: 6 },
  { id: "default-supported-row",   name: "SUPPORTED ROW",    muscleGroup: MuscleGroup.UPPER_BODY, isBodyweight: false, isCompound: true,  sortOrder: 7 },
  { id: "default-barbell-row",     name: "BARBELL ROW",      muscleGroup: MuscleGroup.UPPER_BODY, isBodyweight: false, isCompound: true,  sortOrder: 8 },
  { id: "default-shoulder-press",  name: "SHOULDER PRESS",   muscleGroup: MuscleGroup.UPPER_BODY, isBodyweight: false, isCompound: true,  sortOrder: 9 },
  { id: "default-overhead-press",  name: "OVERHEAD PRESS",   muscleGroup: MuscleGroup.UPPER_BODY, isBodyweight: false, isCompound: true,  sortOrder: 10 },
  { id: "default-assisted-dips",   name: "ASSISTED DIPS",    muscleGroup: MuscleGroup.UPPER_BODY, isBodyweight: false, isCompound: true,  sortOrder: 11 },
  // Isolation
  { id: "default-pec-fly",         name: "PEC DECK",         muscleGroup: MuscleGroup.UPPER_BODY, isBodyweight: false, isCompound: false, sortOrder: 12 },
  { id: "default-lateral-raise",   name: "LATERAL RAISE",    muscleGroup: MuscleGroup.UPPER_BODY, isBodyweight: false, isCompound: false, sortOrder: 13 },
  { id: "default-triceps-push",    name: "TRICEPS PUSHDOWN", muscleGroup: MuscleGroup.UPPER_BODY, isBodyweight: false, isCompound: false, sortOrder: 14 },
  { id: "default-biceps-curls",    name: "BICEPS MACHINE",   muscleGroup: MuscleGroup.UPPER_BODY, isBodyweight: false, isCompound: false, sortOrder: 15 },

  // ── Lower Body ──────────────────────────────────────────────────────────
  // Compounds
  { id: "default-squats",          name: "BACK SQUAT",         muscleGroup: MuscleGroup.LOWER_BODY, isBodyweight: false, isCompound: true,  sortOrder: 1 },
  { id: "default-leg-push",        name: "LEG PRESS",          muscleGroup: MuscleGroup.LOWER_BODY, isBodyweight: false, isCompound: true,  sortOrder: 2 },
  { id: "default-romanian-dl",     name: "ROMANIAN DEADLIFT",  muscleGroup: MuscleGroup.LOWER_BODY, isBodyweight: false, isCompound: true,  sortOrder: 3 },
  { id: "default-deadlift",        name: "DEADLIFT",           muscleGroup: MuscleGroup.LOWER_BODY, isBodyweight: false, isCompound: true,  sortOrder: 4 },
  { id: "default-hack-squat",      name: "HACK SQUAT",         muscleGroup: MuscleGroup.LOWER_BODY, isBodyweight: false, isCompound: true,  sortOrder: 5 },
  { id: "default-smith-squat",     name: "SMITH SQUAT",        muscleGroup: MuscleGroup.LOWER_BODY, isBodyweight: false, isCompound: true,  sortOrder: 6 },
  { id: "default-bulgarian-squat", name: "BULGARIAN SQUAT",    muscleGroup: MuscleGroup.LOWER_BODY, isBodyweight: false, isCompound: true,  sortOrder: 7 },
  { id: "default-walking-lunges",  name: "WALKING LUNGES",     muscleGroup: MuscleGroup.LOWER_BODY, isBodyweight: false, isCompound: true,  sortOrder: 8 },
  { id: "default-hip-thrust",      name: "HIP THRUST",         muscleGroup: MuscleGroup.LOWER_BODY, isBodyweight: false, isCompound: true,  sortOrder: 9 },
  // Isolation
  { id: "default-leg-extension",   name: "LEG EXTENSION",      muscleGroup: MuscleGroup.LOWER_BODY, isBodyweight: false, isCompound: false, sortOrder: 10 },
  { id: "default-leg-pull",        name: "SEATED CURL",        muscleGroup: MuscleGroup.LOWER_BODY, isBodyweight: false, isCompound: false, sortOrder: 11 },
  { id: "default-lying-curl",      name: "LYING CURL",         muscleGroup: MuscleGroup.LOWER_BODY, isBodyweight: false, isCompound: false, sortOrder: 12 },
  { id: "default-glute-drive",     name: "GLUTE DRIVE",        muscleGroup: MuscleGroup.LOWER_BODY, isBodyweight: false, isCompound: false, sortOrder: 13 },
  { id: "default-back-extension",  name: "BACK EXTENSION",     muscleGroup: MuscleGroup.LOWER_BODY, isBodyweight: false, isCompound: false, sortOrder: 14 },
  { id: "default-calf-extension",  name: "STANDING CALVES",    muscleGroup: MuscleGroup.LOWER_BODY, isBodyweight: false, isCompound: false, sortOrder: 15 },

  // ── Bodyweight ──────────────────────────────────────────────────────────
  { id: "default-pushups",   name: "PUSHUPS",    muscleGroup: MuscleGroup.BODYWEIGHT, isBodyweight: true, isCompound: true,  sortOrder: 1 },
  { id: "default-pullups",   name: "PULLUPS",    muscleGroup: MuscleGroup.BODYWEIGHT, isBodyweight: true, isCompound: true,  sortOrder: 2 },
  { id: "default-crunches",  name: "CRUNCHES",   muscleGroup: MuscleGroup.BODYWEIGHT, isBodyweight: true, isCompound: false, sortOrder: 3 },
  { id: "default-leg-raises",name: "LEG RAISES", muscleGroup: MuscleGroup.BODYWEIGHT, isBodyweight: true, isCompound: false, sortOrder: 4 },

  // ── Cardio ───────────────────────────────────────────────────────────────
  { id: "default-biking",     name: "BIKING",      muscleGroup: MuscleGroup.CARDIO, isBodyweight: true, isCompound: false, sortOrder: 1 },
  { id: "default-jogging",    name: "JOGGING",     muscleGroup: MuscleGroup.CARDIO, isBodyweight: true, isCompound: false, sortOrder: 2 },
  { id: "default-padel",      name: "PADEL",       muscleGroup: MuscleGroup.CARDIO, isBodyweight: true, isCompound: false, sortOrder: 3 },
  { id: "default-pickleball", name: "PICKLEBALL",  muscleGroup: MuscleGroup.CARDIO, isBodyweight: true, isCompound: false, sortOrder: 4 },
  { id: "default-badminton",  name: "BADMINTON",   muscleGroup: MuscleGroup.CARDIO, isBodyweight: true, isCompound: false, sortOrder: 5 },
];

async function main() {
  console.log("Seeding default exercises...");

  for (const exercise of DEFAULT_EXERCISES) {
    await prisma.exercise.upsert({
      where: { id: exercise.id },
      update: {
        name: exercise.name,
        muscleGroup: exercise.muscleGroup,
        isBodyweight: exercise.isBodyweight,
        isCompound: exercise.isCompound,
        sortOrder: exercise.sortOrder,
      },
      create: {
        id: exercise.id,
        name: exercise.name,
        muscleGroup: exercise.muscleGroup,
        isBodyweight: exercise.isBodyweight,
        isCompound: exercise.isCompound,
        sortOrder: exercise.sortOrder,
        isDefault: true,
        createdByUserId: null,
      },
    });
  }

  console.log(`✓ Seeded ${DEFAULT_EXERCISES.length} default exercises.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
