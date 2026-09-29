-- CreateTable
CREATE TABLE IF NOT EXISTS "upward_alliance_listing_media" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "listingId" INTEGER NOT NULL,
    "storageKey" VARCHAR(500) NOT NULL,
    "publicUrl" VARCHAR(1000) NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upward_alliance_listing_media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "upward_alliance_listing_media_uuid_key" ON "upward_alliance_listing_media"("uuid");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "upward_alliance_listing_media_listingId_idx" ON "upward_alliance_listing_media"("listingId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "upward_alliance_listing_media_listingId_sortOrder_idx" ON "upward_alliance_listing_media"("listingId", "sortOrder");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "upward_alliance_listing_media" 
        ADD CONSTRAINT "upward_alliance_listing_media_listingId_fkey" 
        FOREIGN KEY ("listingId") REFERENCES "upward_alliance_listing"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
