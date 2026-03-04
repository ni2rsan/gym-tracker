-- AlterTable
ALTER TABLE "PlannedWorkout" ADD COLUMN     "sorryExcused" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "PlannedWorkoutSeries" ADD COLUMN     "streakResetDate" DATE;

-- CreateTable
CREATE TABLE "UserSorryToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "usedCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "UserSorryToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserSorryToken_userId_month_key" ON "UserSorryToken"("userId", "month");

-- AddForeignKey
ALTER TABLE "UserSorryToken" ADD CONSTRAINT "UserSorryToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
