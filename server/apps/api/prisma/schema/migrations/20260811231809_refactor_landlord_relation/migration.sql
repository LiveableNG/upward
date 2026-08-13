-- AlterTable
ALTER TABLE "upward_pm_property" ADD COLUMN     "landlordId" INTEGER;

-- CreateTable
CREATE TABLE "upward_pm_landlord_relation" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "pmId" INTEGER NOT NULL,
    "landlordId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_pm_landlord_relation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "upward_pm_landlord_relation_uuid_key" ON "upward_pm_landlord_relation"("uuid");

-- CreateIndex
CREATE INDEX "upward_pm_landlord_relation_pmId_idx" ON "upward_pm_landlord_relation"("pmId");

-- CreateIndex
CREATE INDEX "upward_pm_landlord_relation_landlordId_idx" ON "upward_pm_landlord_relation"("landlordId");

-- CreateIndex
CREATE UNIQUE INDEX "upward_pm_landlord_relation_pmId_landlordId_key" ON "upward_pm_landlord_relation"("pmId", "landlordId");

-- AddForeignKey
ALTER TABLE "upward_pm_property" ADD CONSTRAINT "upward_pm_property_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "upward_pm_landlord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_pm_landlord_relation" ADD CONSTRAINT "upward_pm_landlord_relation_pmId_fkey" FOREIGN KEY ("pmId") REFERENCES "upward_property_manager"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_pm_landlord_relation" ADD CONSTRAINT "upward_pm_landlord_relation_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "upward_pm_landlord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
