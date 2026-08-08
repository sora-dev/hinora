-- CreateTable
CREATE TABLE "PolicyReadingProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "pagesViewed" INTEGER NOT NULL DEFAULT 0,
    "scrollDepthPercent" INTEGER NOT NULL DEFAULT 0,
    "timeSpentSeconds" INTEGER NOT NULL DEFAULT 0,
    "lastAccessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PolicyReadingProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PolicyReadingProgress_userId_lastAccessedAt_idx" ON "PolicyReadingProgress"("userId", "lastAccessedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PolicyReadingProgress_userId_policyId_key" ON "PolicyReadingProgress"("userId", "policyId");

-- AddForeignKey
ALTER TABLE "PolicyReadingProgress" ADD CONSTRAINT "PolicyReadingProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyReadingProgress" ADD CONSTRAINT "PolicyReadingProgress_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
