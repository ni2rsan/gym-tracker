-- AlterTable
ALTER TABLE "SocialNotificationSeen" ADD COLUMN     "lastSeenFistBumps" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
