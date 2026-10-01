-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "UpwardAllianceListingVisibility" AS ENUM ('ALLIANCE', 'PRIVATE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "upward_alliance_listing" 
    ADD COLUMN IF NOT EXISTS "visibility" "UpwardAllianceListingVisibility" NOT NULL DEFAULT 'ALLIANCE';

-- CreateIndex
CREATE INDEX IF NOT EXISTS "upward_alliance_listing_visibility_idx" ON "upward_alliance_listing"("visibility");
