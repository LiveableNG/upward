-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "UpwardAllianceSourceType" AS ENUM ('LINKED_INVENTORY', 'INDEPENDENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "UpwardAllianceTargetType" AS ENUM ('PROPERTY', 'UNIT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "UpwardAllianceListingIntent" AS ENUM ('RENT', 'SALE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "UpwardAllianceListingStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'UNPUBLISHED', 'ARCHIVED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "upward_alliance_listing" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "pmId" INTEGER NOT NULL,
    "sourceType" "UpwardAllianceSourceType" NOT NULL,
    "targetType" "UpwardAllianceTargetType" NOT NULL,
    "intent" "UpwardAllianceListingIntent" NOT NULL DEFAULT 'RENT',
    "status" "UpwardAllianceListingStatus" NOT NULL DEFAULT 'DRAFT',
    "targetPropertyId" INTEGER,
    "targetUnitId" INTEGER,
    "isSourceDeleted" BOOLEAN NOT NULL DEFAULT false,
    "sourceDeletedAt" TIMESTAMP(3),
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'NGN',
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "address" VARCHAR(255),
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "country" VARCHAR(100) NOT NULL DEFAULT 'Nigeria',
    "propertyType" VARCHAR(100),
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    "unpublishedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "upward_alliance_listing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "upward_alliance_listing_uuid_key" ON "upward_alliance_listing"("uuid");
CREATE INDEX IF NOT EXISTS "upward_alliance_listing_pmId_idx" ON "upward_alliance_listing"("pmId");
CREATE INDEX IF NOT EXISTS "upward_alliance_listing_status_idx" ON "upward_alliance_listing"("status");
CREATE INDEX IF NOT EXISTS "upward_alliance_listing_sourceType_idx" ON "upward_alliance_listing"("sourceType");
CREATE INDEX IF NOT EXISTS "upward_alliance_listing_targetType_idx" ON "upward_alliance_listing"("targetType");
CREATE INDEX IF NOT EXISTS "upward_alliance_listing_targetPropertyId_idx" ON "upward_alliance_listing"("targetPropertyId");
CREATE INDEX IF NOT EXISTS "upward_alliance_listing_targetUnitId_idx" ON "upward_alliance_listing"("targetUnitId");
CREATE INDEX IF NOT EXISTS "upward_alliance_listing_createdAt_idx" ON "upward_alliance_listing"("createdAt");

-- Partial Unique Indexes for One Published Listing per Canonical Target
CREATE UNIQUE INDEX IF NOT EXISTS "upward_alliance_listing_targetPropertyId_published_idx" 
ON "upward_alliance_listing"("targetPropertyId") 
WHERE "status" = 'PUBLISHED' AND "targetPropertyId" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "upward_alliance_listing_targetUnitId_published_idx" 
ON "upward_alliance_listing"("targetUnitId") 
WHERE "status" = 'PUBLISHED' AND "targetUnitId" IS NOT NULL;

-- AddForeignKey
ALTER TABLE "upward_alliance_listing" 
ADD CONSTRAINT "upward_alliance_listing_pmId_fkey" 
FOREIGN KEY ("pmId") REFERENCES "upward_property_manager"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_alliance_listing" 
ADD CONSTRAINT "upward_alliance_listing_targetPropertyId_fkey" 
FOREIGN KEY ("targetPropertyId") REFERENCES "upward_pm_property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_alliance_listing" 
ADD CONSTRAINT "upward_alliance_listing_targetUnitId_fkey" 
FOREIGN KEY ("targetUnitId") REFERENCES "upward_pm_unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
