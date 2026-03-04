-- AlterTable
ALTER TABLE "BodyMetricEntry" ADD COLUMN     "source" TEXT,
ADD COLUMN     "withingsMeasureGrpId" INTEGER;

-- CreateTable
CREATE TABLE "WithingsConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncAt" TIMESTAMP(3),

    CONSTRAINT "WithingsConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WithingsConnection_userId_key" ON "WithingsConnection"("userId");

-- AddForeignKey
ALTER TABLE "WithingsConnection" ADD CONSTRAINT "WithingsConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
