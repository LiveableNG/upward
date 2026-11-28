-- Add ARM B2B2C compulsory KYC fields (NIN, Means of Identification, Residential Address, Proof of Address / Utility Bill)
ALTER TABLE "upward_kyc_verification"
  ADD COLUMN IF NOT EXISTS "ninHash" TEXT,
  ADD COLUMN IF NOT EXISTS "ninMasked" TEXT,
  ADD COLUMN IF NOT EXISTS "ninEncrypted" TEXT,
  ADD COLUMN IF NOT EXISTS "ninVerifiedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "meansOfIdType" TEXT,
  ADD COLUMN IF NOT EXISTS "meansOfIdNumberEnc" TEXT,
  ADD COLUMN IF NOT EXISTS "meansOfIdNumberMasked" TEXT,
  ADD COLUMN IF NOT EXISTS "meansOfIdIssueDate" TEXT,
  ADD COLUMN IF NOT EXISTS "meansOfIdExpiryDate" TEXT,
  ADD COLUMN IF NOT EXISTS "meansOfIdDocKey" TEXT,
  ADD COLUMN IF NOT EXISTS "meansOfIdMimeType" TEXT,
  ADD COLUMN IF NOT EXISTS "meansOfIdFileName" TEXT,
  ADD COLUMN IF NOT EXISTS "residentialAddressNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "residentialStreet" TEXT,
  ADD COLUMN IF NOT EXISTS "residentialTown" TEXT,
  ADD COLUMN IF NOT EXISTS "residentialState" TEXT,
  ADD COLUMN IF NOT EXISTS "utilityBillIssueDate" TEXT,
  ADD COLUMN IF NOT EXISTS "utilityBillDocKey" TEXT,
  ADD COLUMN IF NOT EXISTS "utilityBillMimeType" TEXT,
  ADD COLUMN IF NOT EXISTS "utilityBillFileName" TEXT,
  ADD COLUMN IF NOT EXISTS "addressVerificationStatus" TEXT DEFAULT 'SUBMITTED';

CREATE INDEX IF NOT EXISTS "upward_kyc_verification_ninHash_idx"
  ON "upward_kyc_verification"("ninHash");

-- Create versioned Rent Savings T&C & ARM B2B2C Consent Audit Table
CREATE TABLE IF NOT EXISTS "upward_savings_consent" (
  "id" SERIAL NOT NULL,
  "uuid" TEXT NOT NULL,
  "userId" INTEGER NOT NULL,
  "vaultId" INTEGER,
  "termsVersion" TEXT NOT NULL,
  "consentDocVersion" TEXT NOT NULL,
  "fundCode" TEXT NOT NULL DEFAULT 'ARMMMF',
  "fundName" TEXT NOT NULL DEFAULT 'ARM Money Market Fund',
  "acceptedTerms" BOOLEAN NOT NULL DEFAULT true,
  "acceptedArmMandate" BOOLEAN NOT NULL DEFAULT true,
  "acceptedLockPolicy" BOOLEAN NOT NULL DEFAULT true,
  "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "consentDocKey" TEXT,
  "consentSnapshot" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "upward_savings_consent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "upward_savings_consent_uuid_key"
  ON "upward_savings_consent"("uuid");

CREATE INDEX IF NOT EXISTS "upward_savings_consent_userId_acceptedAt_idx"
  ON "upward_savings_consent"("userId", "acceptedAt");

CREATE INDEX IF NOT EXISTS "upward_savings_consent_vaultId_idx"
  ON "upward_savings_consent"("vaultId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'upward_savings_consent_userId_fkey'
  ) THEN
    ALTER TABLE "upward_savings_consent"
      ADD CONSTRAINT "upward_savings_consent_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "upward_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'upward_savings_consent_vaultId_fkey'
  ) THEN
    ALTER TABLE "upward_savings_consent"
      ADD CONSTRAINT "upward_savings_consent_vaultId_fkey"
      FOREIGN KEY ("vaultId") REFERENCES "upward_rent_vault"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
