-- AlterTable
ALTER TABLE "User" ADD COLUMN     "sorryTokenMax" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "sorryTokenMaxEditedMonth" TEXT;
