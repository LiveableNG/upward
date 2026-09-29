-- CreateEnum
CREATE TYPE "UpwardAllianceReferralStatus" AS ENUM ('ACTIVE', 'CONVERTED', 'LOST', 'CLOSED');

-- CreateEnum
CREATE TYPE "UpwardAllianceLeadStage" AS ENUM ('NEW', 'CONTACTED', 'INTERESTED', 'VIEWING', 'APPLICATION', 'CONVERTED', 'LOST');

-- CreateTable
CREATE TABLE "upward_alliance_referral" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "listingId" INTEGER NOT NULL,
    "referringPmId" INTEGER NOT NULL,
    "matchedUserId" INTEGER,
    "clientIdentityKey" VARCHAR(255) NOT NULL,
    "clientName" VARCHAR(255) NOT NULL,
    "clientEmail" VARCHAR(255),
    "clientPhone" VARCHAR(50),
    "clientNormalizedEmail" VARCHAR(255),
    "clientNormalizedPhone" VARCHAR(50),
    "shareToken" TEXT NOT NULL,
    "status" "UpwardAllianceReferralStatus" NOT NULL DEFAULT 'ACTIVE',
    "stage" "UpwardAllianceLeadStage" NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "convertedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "upward_alliance_referral_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "upward_alliance_referral_uuid_key" ON "upward_alliance_referral"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "upward_alliance_referral_shareToken_key" ON "upward_alliance_referral"("shareToken");

-- CreateIndex
CREATE INDEX "upward_alliance_referral_listingId_idx" ON "upward_alliance_referral"("listingId");

-- CreateIndex
CREATE INDEX "upward_alliance_referral_referringPmId_idx" ON "upward_alliance_referral"("referringPmId");

-- CreateIndex
CREATE INDEX "upward_alliance_referral_matchedUserId_idx" ON "upward_alliance_referral"("matchedUserId");

-- CreateIndex
CREATE INDEX "upward_alliance_referral_clientIdentityKey_idx" ON "upward_alliance_referral"("clientIdentityKey");

-- CreateIndex
CREATE INDEX "upward_alliance_referral_shareToken_idx" ON "upward_alliance_referral"("shareToken");

-- CreateIndex
CREATE INDEX "upward_alliance_referral_status_idx" ON "upward_alliance_referral"("status");

-- CreateIndex
CREATE INDEX "upward_alliance_referral_stage_idx" ON "upward_alliance_referral"("stage");

-- CreateIndex
CREATE INDEX "upward_alliance_referral_createdAt_idx" ON "upward_alliance_referral"("createdAt");

-- CreateIndex
CREATE INDEX "upward_alliance_referral_listingId_clientIdentityKey_idx" ON "upward_alliance_referral"("listingId", "clientIdentityKey");

-- CreateIndex: Exclusivity constraint for active referrals
CREATE UNIQUE INDEX "upward_alliance_referral_active_listing_client_unique" ON "upward_alliance_referral"("listingId", "clientIdentityKey") WHERE "status" = 'ACTIVE';

-- AddForeignKey
ALTER TABLE "upward_alliance_referral" ADD CONSTRAINT "upward_alliance_referral_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "upward_alliance_listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_alliance_referral" ADD CONSTRAINT "upward_alliance_referral_referringPmId_fkey" FOREIGN KEY ("referringPmId") REFERENCES "upward_property_manager"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_alliance_referral" ADD CONSTRAINT "upward_alliance_referral_matchedUserId_fkey" FOREIGN KEY ("matchedUserId") REFERENCES "upward_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
