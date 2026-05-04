/*
  Warnings:

  - You are about to drop the column `rentFrequency` on the `upward_pm_unit` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "upward_pm_property" ADD COLUMN     "landlordEmailEncrypted" TEXT,
ADD COLUMN     "landlordEmailHash" TEXT,
ADD COLUMN     "landlordNameEncrypted" TEXT,
ADD COLUMN     "landlordNameSearch" TEXT,
ADD COLUMN     "landlordPhoneEncrypted" TEXT,
ADD COLUMN     "landlordPhoneHash" TEXT;

-- AlterTable
ALTER TABLE "upward_pm_unit" DROP COLUMN "rentFrequency",
ADD COLUMN     "managementFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "rentType" TEXT NOT NULL DEFAULT 'Monthly';

-- CreateTable
CREATE TABLE "upward_pm_bulk_invite" (
    "id" TEXT NOT NULL,
    "pmId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "totalTenants" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_pm_bulk_invite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_pm_bulk_invite_item" (
    "id" TEXT NOT NULL,
    "bulkInviteId" TEXT NOT NULL,
    "tenantUuid" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "retries" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_pm_bulk_invite_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "upward_pm_bulk_invite_pmId_idx" ON "upward_pm_bulk_invite"("pmId");

-- CreateIndex
CREATE INDEX "upward_pm_bulk_invite_status_idx" ON "upward_pm_bulk_invite"("status");

-- CreateIndex
CREATE INDEX "upward_pm_bulk_invite_item_bulkInviteId_idx" ON "upward_pm_bulk_invite_item"("bulkInviteId");

-- CreateIndex
CREATE INDEX "upward_pm_bulk_invite_item_status_idx" ON "upward_pm_bulk_invite_item"("status");

-- AddForeignKey
ALTER TABLE "upward_pm_bulk_invite" ADD CONSTRAINT "upward_pm_bulk_invite_pmId_fkey" FOREIGN KEY ("pmId") REFERENCES "upward_property_manager"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_pm_bulk_invite_item" ADD CONSTRAINT "upward_pm_bulk_invite_item_bulkInviteId_fkey" FOREIGN KEY ("bulkInviteId") REFERENCES "upward_pm_bulk_invite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
