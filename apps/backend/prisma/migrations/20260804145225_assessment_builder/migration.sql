/*
  Warnings:

  - You are about to drop the `Question` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AssessmentQuestionType" AS ENUM ('MULTIPLE_CHOICE', 'TRUE_FALSE');

-- CreateEnum
CREATE TYPE "AssessmentDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "AssessmentQuestionSource" AS ENUM ('MANUAL', 'AI_GENERATED');

-- DropForeignKey
ALTER TABLE "Question" DROP CONSTRAINT "Question_policyId_fkey";

-- DropTable
DROP TABLE "Question";

-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "instructions" TEXT,
    "status" "AssessmentStatus" NOT NULL DEFAULT 'DRAFT',
    "passingScore" INTEGER NOT NULL DEFAULT 80,
    "maximumAttempts" INTEGER NOT NULL DEFAULT 0,
    "timeLimitMinutes" INTEGER NOT NULL DEFAULT 20,
    "retakeWaitHours" INTEGER NOT NULL DEFAULT 0,
    "randomizeQuestions" BOOLEAN NOT NULL DEFAULT true,
    "shuffleAnswerChoices" BOOLEAN NOT NULL DEFAULT true,
    "showExplanationAfterAnswer" BOOLEAN NOT NULL DEFAULT true,
    "allowReviewAfterSubmission" BOOLEAN NOT NULL DEFAULT true,
    "showScoreImmediately" BOOLEAN NOT NULL DEFAULT true,
    "requirePassToAcknowledge" BOOLEAN NOT NULL DEFAULT true,
    "issueCertificateOnPass" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnFailure" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentQuestion" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "type" "AssessmentQuestionType" NOT NULL DEFAULT 'MULTIPLE_CHOICE',
    "prompt" TEXT NOT NULL,
    "explanation" TEXT,
    "points" INTEGER NOT NULL DEFAULT 1,
    "difficulty" "AssessmentDifficulty" NOT NULL DEFAULT 'MEDIUM',
    "source" "AssessmentQuestionSource" NOT NULL DEFAULT 'MANUAL',
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentQuestionOption" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL,

    CONSTRAINT "AssessmentQuestionOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Assessment_policyId_key" ON "Assessment"("policyId");

-- CreateIndex
CREATE INDEX "AssessmentQuestion_assessmentId_order_idx" ON "AssessmentQuestion"("assessmentId", "order");

-- CreateIndex
CREATE INDEX "AssessmentQuestionOption_questionId_order_idx" ON "AssessmentQuestionOption"("questionId", "order");

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentQuestion" ADD CONSTRAINT "AssessmentQuestion_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentQuestionOption" ADD CONSTRAINT "AssessmentQuestionOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "AssessmentQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
