-- CreateTable
CREATE TABLE "AssessmentDraft" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "answers" JSONB NOT NULL DEFAULT '{}',
    "bookmarks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "questionIndex" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssessmentDraft_userId_updatedAt_idx" ON "AssessmentDraft"("userId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentDraft_userId_policyId_key" ON "AssessmentDraft"("userId", "policyId");

-- AddForeignKey
ALTER TABLE "AssessmentDraft" ADD CONSTRAINT "AssessmentDraft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentDraft" ADD CONSTRAINT "AssessmentDraft_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
