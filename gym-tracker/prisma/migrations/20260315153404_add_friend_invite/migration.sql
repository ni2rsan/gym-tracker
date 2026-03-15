-- CreateTable
CREATE TABLE "FriendInvite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FriendInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FriendInvite_userId_key" ON "FriendInvite"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FriendInvite_token_key" ON "FriendInvite"("token");

-- CreateIndex
CREATE INDEX "FriendInvite_token_idx" ON "FriendInvite"("token");

-- AddForeignKey
ALTER TABLE "FriendInvite" ADD CONSTRAINT "FriendInvite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
