-- AlterTable
ALTER TABLE "User" ADD COLUMN "username" TEXT,
ADD COLUMN "profileImageBase64" TEXT,
ADD COLUMN "heightCm" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
