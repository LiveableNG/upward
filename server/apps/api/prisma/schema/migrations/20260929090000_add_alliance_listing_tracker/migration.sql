-- CreateTable
CREATE TABLE IF NOT EXISTS "upward_alliance_listing_tracker" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "listingId" INTEGER NOT NULL,
    "trackerPmId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upward_alliance_listing_tracker_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "upward_alliance_listing_tracker_uuid_key" ON "upward_alliance_listing_tracker"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "upward_alliance_listing_tracker_listingId_trackerPmId_key" ON "upward_alliance_listing_tracker"("listingId", "trackerPmId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "upward_alliance_listing_tracker_listingId_idx" ON "upward_alliance_listing_tracker"("listingId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "upward_alliance_listing_tracker_trackerPmId_idx" ON "upward_alliance_listing_tracker"("trackerPmId");

-- AddForeignKey
ALTER TABLE "upward_alliance_listing_tracker" DROP CONSTRAINT IF EXISTS "upward_alliance_listing_tracker_listingId_fkey";
ALTER TABLE "upward_alliance_listing_tracker" ADD CONSTRAINT "upward_alliance_listing_tracker_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "upward_alliance_listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_alliance_listing_tracker" DROP CONSTRAINT IF EXISTS "upward_alliance_listing_tracker_trackerPmId_fkey";
ALTER TABLE "upward_alliance_listing_tracker" ADD CONSTRAINT "upward_alliance_listing_tracker_trackerPmId_fkey" FOREIGN KEY ("trackerPmId") REFERENCES "upward_property_manager"("id") ON DELETE CASCADE ON UPDATE CASCADE;
