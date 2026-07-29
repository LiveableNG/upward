/*
  Warnings:

  - A unique constraint covering the columns `[platformId,externalUnitId]` on the table `upward_user_property` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "upward_user_property" ADD COLUMN     "externalPropertyId" INTEGER,
ADD COLUMN     "externalUnitId" INTEGER,
ADD COLUMN     "platformId" INTEGER;

-- CreateIndex
CREATE INDEX "upward_user_property_platformId_externalPropertyId_idx" ON "upward_user_property"("platformId", "externalPropertyId");

-- CreateIndex
CREATE UNIQUE INDEX "upward_user_property_platformId_externalUnitId_key" ON "upward_user_property"("platformId", "externalUnitId");
