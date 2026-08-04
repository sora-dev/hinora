/*
  Warnings:

  - A unique constraint covering the columns `[filePath]` on the table `Policy` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `department` to the `Policy` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fileName` to the `Policy` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CategoryStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "PolicyStatus" AS ENUM ('DRAFT', 'UNDER_REVIEW', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PolicyDocumentType" AS ENUM ('POLICY', 'GUIDELINE', 'PROCEDURE');

-- AlterTable
ALTER TABLE "Policy" ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "department" TEXT NOT NULL,
ADD COLUMN     "fileName" TEXT NOT NULL,
ADD COLUMN     "status" "PolicyStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "type" "PolicyDocumentType" NOT NULL DEFAULT 'POLICY';

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#2563EB',
    "status" "CategoryStatus" NOT NULL DEFAULT 'ACTIVE',
    "parentId" TEXT,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_code_key" ON "Category"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Policy_filePath_key" ON "Policy"("filePath");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Policy" ADD CONSTRAINT "Policy_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
