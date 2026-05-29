/*
  Warnings:

  - You are about to drop the column `letterheadFooterUrl` on the `upward_property_manager` table. All the data in the column will be lost.
  - You are about to drop the column `letterheadHeaderUrl` on the `upward_property_manager` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "upward_property_manager" DROP COLUMN "letterheadFooterUrl",
DROP COLUMN "letterheadHeaderUrl";

-- CreateTable
CREATE TABLE "upward_pm_letterhead" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "pmId" INTEGER NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "pageCount" INTEGER NOT NULL DEFAULT 1,
    "templateFileKey" TEXT,
    "previewFirstPageKey" TEXT,
    "previewContinuationPageKey" TEXT,
    "templateConfig" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_pm_letterhead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "upward_pm_letterhead_uuid_key" ON "upward_pm_letterhead"("uuid");

-- CreateIndex
CREATE INDEX "upward_pm_letterhead_pmId_idx" ON "upward_pm_letterhead"("pmId");

-- AddForeignKey
ALTER TABLE "upward_pm_letterhead" ADD CONSTRAINT "upward_pm_letterhead_pmId_fkey" FOREIGN KEY ("pmId") REFERENCES "upward_property_manager"("id") ON DELETE CASCADE ON UPDATE CASCADE;
