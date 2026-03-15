-- CreateTable
CREATE TABLE "WorkoutFistBump" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkoutFistBump_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialNotificationSeen" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastSeenRequests" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenFeed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialNotificationSeen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkoutFistBump_sessionId_idx" ON "WorkoutFistBump"("sessionId");

-- CreateIndex
CREATE INDEX "WorkoutFistBump_userId_idx" ON "WorkoutFistBump"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutFistBump_userId_sessionId_key" ON "WorkoutFistBump"("userId", "sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "SocialNotificationSeen_userId_key" ON "SocialNotificationSeen"("userId");

-- AddForeignKey
ALTER TABLE "WorkoutFistBump" ADD CONSTRAINT "WorkoutFistBump_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutFistBump" ADD CONSTRAINT "WorkoutFistBump_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WorkoutSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialNotificationSeen" ADD CONSTRAINT "SocialNotificationSeen_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
