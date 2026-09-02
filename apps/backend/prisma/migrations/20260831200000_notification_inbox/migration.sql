-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('ASSIGNMENT', 'COMPLIANCE', 'SYSTEM', 'UPDATES');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- AlterTable
ALTER TABLE "NotificationMessage"
  ALTER COLUMN "batchId" DROP NOT NULL,
  ALTER COLUMN "policyId" DROP NOT NULL,
  ADD COLUMN "category" "NotificationCategory" NOT NULL DEFAULT 'COMPLIANCE',
  ADD COLUMN "priority" "NotificationPriority" NOT NULL DEFAULT 'MEDIUM',
  ADD COLUMN "snoozedUntil" TIMESTAMP(3),
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "metadata" JSONB;

-- CreateIndex
CREATE INDEX "NotificationMessage_userId_readAt_deletedAt_idx" ON "NotificationMessage"("userId", "readAt", "deletedAt");
