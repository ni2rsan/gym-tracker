import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, MuscleGroup } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const DEFAULT_EXERCISES = [
  // Upper Body
  { name: "LAT PULL", muscleGroup: MuscleGroup.UPPER_BODY, isBodyweight: false, sortOrder: 1 },
  { name: "TRICEPS PUSH", muscleGroup: MuscleGroup.UPPER_BODY, isBodyweight: false, sortOrder: 2 },
  { name: "ROWING PULL", muscleGroup: MuscleGroup.UPPER_BODY, isBodyweight: false, sortOrder: 3 },
  { name: "SHOULDER PRESS", muscleGroup: MuscleGroup.UPPER_BODY, isBodyweight: false, sortOrder: 4 },
  { name: "CHEST PRESS", muscleGroup: MuscleGroup.UPPER_BODY, isBodyweight: false, sortOrder: 5 },
  { name: "LATERAL RAISE", muscleGroup: MuscleGroup.UPPER_BODY, isBodyweight: false, sortOrder: 6 },
  { name: "BICEPS CURLS", muscleGroup: MuscleGroup.UPPER_BODY, isBodyweight: false, sortOrder: 7 },
  { name: "BICEPS DUMBBELL", muscleGroup: MuscleGroup.UPPER_BODY, isBodyweight: false, sortOrder: 8 },
  { name: "PEC FLY", muscleGroup: MuscleGroup.UPPER_BODY, isBodyweight: false, sortOrder: 9 },
  // Lower Body
  { name: "SQUATS", muscleGroup: MuscleGroup.LOWER_BODY, isBodyweight: false, sortOrder: 1 },
  { name: "LEG PUSH", muscleGroup: MuscleGroup.LOWER_BODY, isBodyweight: false, sortOrder: 2 },
  { name: "LEG PULL", muscleGroup: MuscleGroup.LOWER_BODY, isBodyweight: false, sortOrder: 3 },
  { name: "CALF EXTENSION", muscleGroup: MuscleGroup.LOWER_BODY, isBodyweight: false, sortOrder: 4 },
  { name: "BACK EXTENSION", muscleGroup: MuscleGroup.LOWER_BODY, isBodyweight: false, sortOrder: 5 },
  // Bodyweight
  { name: "PUSHUPS", muscleGroup: MuscleGroup.BODYWEIGHT, isBodyweight: true, sortOrder: 1 },
  { name: "PULLUPS", muscleGroup: MuscleGroup.BODYWEIGHT, isBodyweight: true, sortOrder: 2 },
];

async function main() {
  console.log("Seeding default exercises...");

  for (const exercise of DEFAULT_EXERCISES) {
    const id = `default-${exercise.name.toLowerCase().replace(/\s+/g, "-")}`;
    await prisma.exercise.upsert({
      where: { id },
      update: {},
      create: {
        id,
        ...exercise,
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
