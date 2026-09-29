-- CreateEnum
CREATE TYPE "UpwardAllianceCommissionStatus" AS ENUM ('PENDING', 'EARNED', 'PAYABLE', 'PAID', 'REVERSED', 'VOID');

-- CreateEnum
CREATE TYPE "UpwardAllianceCommissionType" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateEnum
CREATE TYPE "UpwardAllianceRatingAuthorType" AS ENUM ('PM', 'CLIENT');

-- CreateEnum
CREATE TYPE "UpwardAllianceRatingSubjectType" AS ENUM ('CLIENT', 'PM', 'LISTING');

-- CreateTable
CREATE TABLE "upward_alliance_commission" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "referralId" INTEGER NOT NULL,
    "referringPmId" INTEGER NOT NULL,
    "listingId" INTEGER NOT NULL,
    "sourceTransactionId" INTEGER,
    "sourceRentPaymentId" INTEGER,
    "transactionReference" VARCHAR(255),
    "commissionType" "UpwardAllianceCommissionType" NOT NULL DEFAULT 'PERCENTAGE',
    "sourceAmount" DOUBLE PRECISION NOT NULL,
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "commissionAmount" DOUBLE PRECISION NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'NGN',
    "status" "UpwardAllianceCommissionStatus" NOT NULL DEFAULT 'EARNED',
    "notes" TEXT,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payableAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "reversedAt" TIMESTAMP(3),
    "reversalReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_alliance_commission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_alliance_rating" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "referralId" INTEGER NOT NULL,
    "authorType" "UpwardAllianceRatingAuthorType" NOT NULL,
    "authorPmId" INTEGER,
    "authorUserId" INTEGER,
    "subjectType" "UpwardAllianceRatingSubjectType" NOT NULL,
    "subjectPmId" INTEGER,
    "subjectUserId" INTEGER,
    "subjectListingId" INTEGER,
    "score" INTEGER NOT NULL,
    "review" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_alliance_rating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "upward_alliance_commission_uuid_key" ON "upward_alliance_commission"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "upward_alliance_commission_referralId_transactionReference_key" ON "upward_alliance_commission"("referralId", "transactionReference");

-- CreateIndex
CREATE INDEX "upward_alliance_commission_referralId_idx" ON "upward_alliance_commission"("referralId");

-- CreateIndex
CREATE INDEX "upward_alliance_commission_referringPmId_idx" ON "upward_alliance_commission"("referringPmId");

-- CreateIndex
CREATE INDEX "upward_alliance_commission_listingId_idx" ON "upward_alliance_commission"("listingId");

-- CreateIndex
CREATE INDEX "upward_alliance_commission_sourceTransactionId_idx" ON "upward_alliance_commission"("sourceTransactionId");

-- CreateIndex
CREATE INDEX "upward_alliance_commission_sourceRentPaymentId_idx" ON "upward_alliance_commission"("sourceRentPaymentId");

-- CreateIndex
CREATE INDEX "upward_alliance_commission_status_idx" ON "upward_alliance_commission"("status");

-- CreateIndex
CREATE INDEX "upward_alliance_commission_earnedAt_idx" ON "upward_alliance_commission"("earnedAt");

-- CreateIndex
CREATE INDEX "upward_alliance_commission_createdAt_idx" ON "upward_alliance_commission"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "upward_alliance_rating_uuid_key" ON "upward_alliance_rating"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "upward_alliance_rating_referralId_authorType_authorPmId_authorUserId_key" ON "upward_alliance_rating"("referralId", "authorType", "authorPmId", "authorUserId");

-- CreateIndex
CREATE INDEX "upward_alliance_rating_referralId_idx" ON "upward_alliance_rating"("referralId");

-- CreateIndex
CREATE INDEX "upward_alliance_rating_authorPmId_idx" ON "upward_alliance_rating"("authorPmId");

-- CreateIndex
CREATE INDEX "upward_alliance_rating_authorUserId_idx" ON "upward_alliance_rating"("authorUserId");

-- CreateIndex
CREATE INDEX "upward_alliance_rating_subjectPmId_idx" ON "upward_alliance_rating"("subjectPmId");

-- CreateIndex
CREATE INDEX "upward_alliance_rating_subjectUserId_idx" ON "upward_alliance_rating"("subjectUserId");

-- CreateIndex
CREATE INDEX "upward_alliance_rating_subjectListingId_idx" ON "upward_alliance_rating"("subjectListingId");

-- CreateIndex
CREATE INDEX "upward_alliance_rating_score_idx" ON "upward_alliance_rating"("score");

-- CreateIndex
CREATE INDEX "upward_alliance_rating_createdAt_idx" ON "upward_alliance_rating"("createdAt");

-- AddForeignKey
ALTER TABLE "upward_alliance_commission" ADD CONSTRAINT "upward_alliance_commission_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "upward_alliance_referral"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_alliance_commission" ADD CONSTRAINT "upward_alliance_commission_referringPmId_fkey" FOREIGN KEY ("referringPmId") REFERENCES "upward_property_manager"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_alliance_commission" ADD CONSTRAINT "upward_alliance_commission_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "upward_alliance_listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_alliance_commission" ADD CONSTRAINT "upward_alliance_commission_sourceTransactionId_fkey" FOREIGN KEY ("sourceTransactionId") REFERENCES "upward_transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_alliance_commission" ADD CONSTRAINT "upward_alliance_commission_sourceRentPaymentId_fkey" FOREIGN KEY ("sourceRentPaymentId") REFERENCES "upward_pm_rent_payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_alliance_rating" ADD CONSTRAINT "upward_alliance_rating_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "upward_alliance_referral"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_alliance_rating" ADD CONSTRAINT "upward_alliance_rating_authorPmId_fkey" FOREIGN KEY ("authorPmId") REFERENCES "upward_property_manager"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_alliance_rating" ADD CONSTRAINT "upward_alliance_rating_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "upward_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_alliance_rating" ADD CONSTRAINT "upward_alliance_rating_subjectPmId_fkey" FOREIGN KEY ("subjectPmId") REFERENCES "upward_property_manager"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_alliance_rating" ADD CONSTRAINT "upward_alliance_rating_subjectUserId_fkey" FOREIGN KEY ("subjectUserId") REFERENCES "upward_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_alliance_rating" ADD CONSTRAINT "upward_alliance_rating_subjectListingId_fkey" FOREIGN KEY ("subjectListingId") REFERENCES "upward_alliance_listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;
