-- CreateEnum
CREATE TYPE "PolicyAssignmentStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PolicyAssignmentScope" AS ENUM ('ORGANIZATION', 'DEPARTMENT', 'LOCATION', 'ROLE', 'USER');

-- CreateEnum
CREATE TYPE "PolicyAssignmentPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "PolicyAssignment" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "scopeKind" "PolicyAssignmentScope" NOT NULL,
    "scopeTarget" TEXT NOT NULL DEFAULT '',
    "scopeLabel" TEXT NOT NULL,
    "userIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "startAt" TIMESTAMP(3) NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "status" "PolicyAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "priority" "PolicyAssignmentPriority" NOT NULL DEFAULT 'MEDIUM',
    "notes" TEXT NOT NULL DEFAULT '',
    "internalNotes" TEXT NOT NULL DEFAULT '',
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PolicyAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PolicyAssignment_createdAt_idx" ON "PolicyAssignment"("createdAt");

-- CreateIndex
CREATE INDEX "PolicyAssignment_policyId_createdAt_idx" ON "PolicyAssignment"("policyId", "createdAt");

-- CreateIndex
CREATE INDEX "PolicyAssignment_status_dueAt_idx" ON "PolicyAssignment"("status", "dueAt");

-- CreateIndex
CREATE INDEX "PolicyAssignment_scopeKind_status_idx" ON "PolicyAssignment"("scopeKind", "status");

-- AddForeignKey
ALTER TABLE "PolicyAssignment" ADD CONSTRAINT "PolicyAssignment_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyAssignment" ADD CONSTRAINT "PolicyAssignment_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
