-- CreateEnum
CREATE TYPE "RequestType" AS ENUM ('BUG', 'FEATURE');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('IN_REVIEW', 'ACCEPTED', 'DECLINED', 'DEPLOYED');

-- CreateTable
CREATE TABLE "UserRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "RequestType" NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'IN_REVIEW',
    "text" TEXT NOT NULL,
    "screenshotBase64" TEXT,
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserRequest_userId_idx" ON "UserRequest"("userId");

-- CreateIndex
CREATE INDEX "UserRequest_status_idx" ON "UserRequest"("status");

-- AddForeignKey
ALTER TABLE "UserRequest" ADD CONSTRAINT "UserRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
