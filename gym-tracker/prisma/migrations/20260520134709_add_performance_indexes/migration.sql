-- DropIndex
DROP INDEX "Friendship_receiverId_idx";

-- DropIndex
DROP INDEX "Friendship_senderId_idx";

-- CreateIndex
CREATE INDEX "Friendship_senderId_status_idx" ON "Friendship"("senderId", "status");

-- CreateIndex
CREATE INDEX "Friendship_receiverId_status_idx" ON "Friendship"("receiverId", "status");

-- CreateIndex
CREATE INDEX "PlannedWorkout_seriesId_idx" ON "PlannedWorkout"("seriesId");

-- CreateIndex
CREATE INDEX "WorkoutFistBump_createdAt_idx" ON "WorkoutFistBump"("createdAt");

-- CreateIndex
CREATE INDEX "WorkoutSession_userId_createdAt_idx" ON "WorkoutSession"("userId", "createdAt");

-- Partial unique index: only one active (non-deleted) session per user per date
CREATE UNIQUE INDEX "WorkoutSession_userId_date_active_uniq" ON "WorkoutSession"("userId", "date") WHERE "deletedAt" IS NULL;
