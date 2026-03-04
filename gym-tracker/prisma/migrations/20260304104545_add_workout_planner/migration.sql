-- CreateEnum
CREATE TYPE "BlockType" AS ENUM ('UPPER_BODY', 'LOWER_BODY', 'FULL_BODY', 'CARDIO');

-- CreateEnum
CREATE TYPE "SeriesRuleType" AS ENUM ('WEEKDAYS', 'INTERVAL');

-- CreateTable
CREATE TABLE "PlannedWorkoutSeries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "blockType" "BlockType" NOT NULL,
    "ruleType" "SeriesRuleType" NOT NULL,
    "weekdays" INTEGER[],
    "intervalDays" INTEGER,
    "startDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlannedWorkoutSeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlannedWorkout" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "blockType" "BlockType" NOT NULL,
    "seriesId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlannedWorkout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlannedWorkoutSeries_userId_idx" ON "PlannedWorkoutSeries"("userId");

-- CreateIndex
CREATE INDEX "PlannedWorkout_userId_date_idx" ON "PlannedWorkout"("userId", "date");

-- AddForeignKey
ALTER TABLE "PlannedWorkoutSeries" ADD CONSTRAINT "PlannedWorkoutSeries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannedWorkout" ADD CONSTRAINT "PlannedWorkout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannedWorkout" ADD CONSTRAINT "PlannedWorkout_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "PlannedWorkoutSeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
