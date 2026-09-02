-- CreateEnum
CREATE TYPE "ReportHistoryFormat" AS ENUM ('CSV', 'PDF', 'XLS', 'VIEW');

-- CreateEnum
CREATE TYPE "ReportHistoryStatus" AS ENUM ('COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "ReportHistory" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedBy" TEXT NOT NULL,
    "dateFrom" TEXT NOT NULL,
    "dateTo" TEXT NOT NULL,
    "format" "ReportHistoryFormat" NOT NULL,
    "status" "ReportHistoryStatus" NOT NULL DEFAULT 'COMPLETED',
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReportHistory_generatedAt_idx" ON "ReportHistory"("generatedAt");

-- CreateIndex
CREATE INDEX "ReportHistory_reportId_generatedAt_idx" ON "ReportHistory"("reportId", "generatedAt");
