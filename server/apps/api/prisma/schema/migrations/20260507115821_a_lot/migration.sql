-- AlterTable
ALTER TABLE "upward_pm_tenant" ADD COLUMN     "emergencyContactEmail" TEXT,
ADD COLUMN     "emergencyContactName" TEXT,
ADD COLUMN     "emergencyContactPhone" TEXT,
ADD COLUMN     "formerAddress" TEXT,
ADD COLUMN     "guarantorEmail" TEXT,
ADD COLUMN     "guarantorName" TEXT,
ADD COLUMN     "guarantorPhone" TEXT,
ADD COLUMN     "nextOfKinEmail" TEXT,
ADD COLUMN     "nextOfKinName" TEXT,
ADD COLUMN     "nextOfKinPhone" TEXT;

-- CreateTable
CREATE TABLE "upward_pm_landlord_report" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "pmId" INTEGER NOT NULL,
    "landlordEmail" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "reportData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upward_pm_landlord_report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "upward_pm_landlord_report_uuid_key" ON "upward_pm_landlord_report"("uuid");

-- CreateIndex
CREATE INDEX "upward_pm_landlord_report_pmId_idx" ON "upward_pm_landlord_report"("pmId");

-- CreateIndex
CREATE INDEX "upward_pm_landlord_report_landlordEmail_idx" ON "upward_pm_landlord_report"("landlordEmail");

-- AddForeignKey
ALTER TABLE "upward_pm_landlord_report" ADD CONSTRAINT "upward_pm_landlord_report_pmId_fkey" FOREIGN KEY ("pmId") REFERENCES "upward_property_manager"("id") ON DELETE CASCADE ON UPDATE CASCADE;
