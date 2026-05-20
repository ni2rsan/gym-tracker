-- DropIndex (IF EXISTS for idempotency — partial prior run may have already dropped these)
DROP INDEX IF EXISTS "Friendship_receiverId_idx";

-- DropIndex
DROP INDEX IF EXISTS "Friendship_senderId_idx";

-- CreateIndex (IF NOT EXISTS for idempotency — partial prior run may have already created these)
CREATE INDEX IF NOT EXISTS "Friendship_senderId_status_idx" ON "Friendship"("senderId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Friendship_receiverId_status_idx" ON "Friendship"("receiverId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PlannedWorkout_seriesId_idx" ON "PlannedWorkout"("seriesId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WorkoutFistBump_createdAt_idx" ON "WorkoutFistBump"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WorkoutSession_userId_createdAt_idx" ON "WorkoutSession"("userId", "createdAt");

-- Soft-delete duplicate active sessions before creating unique index.
-- For each (userId, date) with multiple active rows, keep the one with the most
-- recent createdAt (i.e. the latest session) and mark the rest as deleted.
UPDATE "WorkoutSession" ws
SET "deletedAt" = NOW()
WHERE ws."deletedAt" IS NULL
  AND ws.id NOT IN (
    SELECT DISTINCT ON (sub."userId", sub."date") sub.id
    FROM "WorkoutSession" sub
    WHERE sub."deletedAt" IS NULL
    ORDER BY sub."userId", sub."date", sub."createdAt" DESC
  );

-- Partial unique index: only one active (non-deleted) session per user per date
CREATE UNIQUE INDEX IF NOT EXISTS "WorkoutSession_userId_date_active_uniq" ON "WorkoutSession"("userId", "date") WHERE "deletedAt" IS NULL;
