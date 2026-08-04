-- CreateEnum
CREATE TYPE "PolicyAnalysisStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "PolicyAnalysisProvider" AS ENUM ('OPENAI', 'LOCAL_FALLBACK');

-- AlterTable
ALTER TABLE "Policy" ADD COLUMN     "analysisCompletedAt" TIMESTAMP(3),
ADD COLUMN     "analysisError" TEXT,
ADD COLUMN     "analysisModel" TEXT,
ADD COLUMN     "analysisProvider" "PolicyAnalysisProvider",
ADD COLUMN     "analysisRequestedAt" TIMESTAMP(3),
ADD COLUMN     "analysisStatus" "PolicyAnalysisStatus" NOT NULL DEFAULT 'NOT_STARTED',
ADD COLUMN     "keyPoints" JSONB,
ADD COLUMN     "suggestedQuestions" JSONB,
ADD COLUMN     "summaryLong" TEXT,
ADD COLUMN     "summaryShort" TEXT;
