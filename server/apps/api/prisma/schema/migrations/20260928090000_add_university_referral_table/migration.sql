-- CreateTable
CREATE TABLE IF NOT EXISTS "upward_university_referral" (
    "id" TEXT NOT NULL,
    "referrerEarlyAccessId" TEXT,
    "referrerName" TEXT NOT NULL,
    "referrerEmail" TEXT,
    "referrerPhone" TEXT NOT NULL,
    "referredName" TEXT,
    "referredEmail" TEXT,
    "referredPhone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rewardPercentage" DOUBLE PRECISION NOT NULL DEFAULT 10.0,
    "rewardAmount" DOUBLE PRECISION,
    "rewardStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "programFeePaid" DOUBLE PRECISION,
    "paymentRef" TEXT,
    "joinedAt" TIMESTAMP(3),
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "emailSentAt" TIMESTAMP(3),
    "ineligibleReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_university_referral_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "upward_university_referral_referrerEarlyAccessId_idx" ON "upward_university_referral"("referrerEarlyAccessId");
CREATE INDEX IF NOT EXISTS "upward_university_referral_referrerEmail_idx" ON "upward_university_referral"("referrerEmail");
CREATE INDEX IF NOT EXISTS "upward_university_referral_referrerPhone_idx" ON "upward_university_referral"("referrerPhone");
CREATE INDEX IF NOT EXISTS "upward_university_referral_referredEmail_idx" ON "upward_university_referral"("referredEmail");
CREATE INDEX IF NOT EXISTS "upward_university_referral_referredPhone_idx" ON "upward_university_referral"("referredPhone");
CREATE INDEX IF NOT EXISTS "upward_university_referral_status_idx" ON "upward_university_referral"("status");
CREATE INDEX IF NOT EXISTS "upward_university_referral_createdAt_idx" ON "upward_university_referral"("createdAt");
