-- AlterTable
ALTER TABLE "User" ADD COLUMN     "stardustSynced" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stardustTotal" INTEGER NOT NULL DEFAULT 0;
