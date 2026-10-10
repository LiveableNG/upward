-- AlterTable upward_pm_property
ALTER TABLE "upward_pm_property" ADD COLUMN IF NOT EXISTS "splitProfileId" INTEGER;

-- AlterTable upward_pm_payment_request
ALTER TABLE "upward_pm_payment_request" ADD COLUMN IF NOT EXISTS "splitProfileId" INTEGER;

-- CreateTable upward_pm_split_profile
CREATE TABLE IF NOT EXISTS "upward_pm_split_profile" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "pmId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_pm_split_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable upward_pm_split_profile_item
CREATE TABLE IF NOT EXISTS "upward_pm_split_profile_item" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "profileId" INTEGER NOT NULL,
    "manualAccountId" INTEGER NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "lineItemName" TEXT NOT NULL DEFAULT 'Rent',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_pm_split_profile_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "upward_pm_split_profile_uuid_key" ON "upward_pm_split_profile"("uuid");
CREATE INDEX IF NOT EXISTS "upward_pm_split_profile_pmId_idx" ON "upward_pm_split_profile"("pmId");

CREATE UNIQUE INDEX IF NOT EXISTS "upward_pm_split_profile_item_uuid_key" ON "upward_pm_split_profile_item"("uuid");
CREATE INDEX IF NOT EXISTS "upward_pm_split_profile_item_profileId_idx" ON "upward_pm_split_profile_item"("profileId");
CREATE INDEX IF NOT EXISTS "upward_pm_split_profile_item_manualAccountId_idx" ON "upward_pm_split_profile_item"("manualAccountId");

CREATE INDEX IF NOT EXISTS "upward_pm_property_splitProfileId_idx" ON "upward_pm_property"("splitProfileId");
CREATE INDEX IF NOT EXISTS "upward_pm_payment_request_splitProfileId_idx" ON "upward_pm_payment_request"("splitProfileId");

-- AddForeignKey
ALTER TABLE "upward_pm_property" DROP CONSTRAINT IF EXISTS "upward_pm_property_splitProfileId_fkey";
ALTER TABLE "upward_pm_property" ADD CONSTRAINT "upward_pm_property_splitProfileId_fkey" FOREIGN KEY ("splitProfileId") REFERENCES "upward_pm_split_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "upward_pm_payment_request" DROP CONSTRAINT IF EXISTS "upward_pm_payment_request_splitProfileId_fkey";
ALTER TABLE "upward_pm_payment_request" ADD CONSTRAINT "upward_pm_payment_request_splitProfileId_fkey" FOREIGN KEY ("splitProfileId") REFERENCES "upward_pm_split_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "upward_pm_split_profile" DROP CONSTRAINT IF EXISTS "upward_pm_split_profile_pmId_fkey";
ALTER TABLE "upward_pm_split_profile" ADD CONSTRAINT "upward_pm_split_profile_pmId_fkey" FOREIGN KEY ("pmId") REFERENCES "upward_property_manager"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "upward_pm_split_profile_item" DROP CONSTRAINT IF EXISTS "upward_pm_split_profile_item_profileId_fkey";
ALTER TABLE "upward_pm_split_profile_item" ADD CONSTRAINT "upward_pm_split_profile_item_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "upward_pm_split_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "upward_pm_split_profile_item" DROP CONSTRAINT IF EXISTS "upward_pm_split_profile_item_manualAccountId_fkey";
ALTER TABLE "upward_pm_split_profile_item" ADD CONSTRAINT "upward_pm_split_profile_item_manualAccountId_fkey" FOREIGN KEY ("manualAccountId") REFERENCES "upward_manual_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
