-- Add 3-state savingsMode to upward_platform_rate_config (idempotent)
ALTER TABLE "upward_platform_rate_config"
  ADD COLUMN IF NOT EXISTS "savingsMode" TEXT NOT NULL DEFAULT 'LIVE';

-- Sync existing rows where savingsEnabled = false
UPDATE "upward_platform_rate_config"
SET "savingsMode" = 'COMING_SOON'
WHERE "savingsEnabled" = false AND "savingsMode" = 'LIVE';

-- 1:1 Treasury & Premium Recovery summary per vault
CREATE TABLE IF NOT EXISTS "upward_vault_treasury_summary" (
  "id" SERIAL NOT NULL,
  "uuid" TEXT NOT NULL,
  "vaultId" INTEGER NOT NULL,
  "productOption" TEXT NOT NULL DEFAULT 'SAVE_AND_EARN',
  "grossArmYieldAccruedKobo" BIGINT NOT NULL DEFAULT 0,
  "customerYieldAccruedKobo" BIGINT NOT NULL DEFAULT 0,
  "platformSpreadAccruedKobo" BIGINT NOT NULL DEFAULT 0,
  "upfrontPremiumObligationKobo" BIGINT NOT NULL DEFAULT 0,
  "premiumRecoveredKobo" BIGINT NOT NULL DEFAULT 0,
  "unrecoveredPremiumKobo" BIGINT NOT NULL DEFAULT 0,
  "netPlatformMarginKobo" BIGINT NOT NULL DEFAULT 0,
  "lastAccrualDate" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "upward_vault_treasury_summary_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "upward_vault_treasury_summary_uuid_key" UNIQUE ("uuid"),
  CONSTRAINT "upward_vault_treasury_summary_vaultId_key" UNIQUE ("vaultId"),
  CONSTRAINT "upward_vault_treasury_summary_vaultId_fkey" FOREIGN KEY ("vaultId") REFERENCES "upward_rent_vault"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "upward_vault_treasury_summary_productOption_idx"
  ON "upward_vault_treasury_summary"("productOption");

-- Append-only internal treasury & yield-spread ledger
CREATE TABLE IF NOT EXISTS "upward_savings_internal_ledger" (
  "id" SERIAL NOT NULL,
  "uuid" TEXT NOT NULL,
  "vaultId" INTEGER NOT NULL,
  "entryDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "entryType" TEXT NOT NULL,
  "productOption" TEXT NOT NULL DEFAULT 'SAVE_AND_EARN',
  "principalBaseKobo" BIGINT NOT NULL DEFAULT 0,
  "grossArmRatePct" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "customerRatePct" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "grossArmYieldKobo" BIGINT NOT NULL DEFAULT 0,
  "customerNetYieldKobo" BIGINT NOT NULL DEFAULT 0,
  "yieldSpreadKobo" BIGINT NOT NULL DEFAULT 0,
  "premiumObligationDeltaKobo" BIGINT NOT NULL DEFAULT 0,
  "premiumRecoveryAppliedKobo" BIGINT NOT NULL DEFAULT 0,
  "netMarginDeltaKobo" BIGINT NOT NULL DEFAULT 0,
  "reference" TEXT,
  "notes" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "upward_savings_internal_ledger_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "upward_savings_internal_ledger_uuid_key" UNIQUE ("uuid"),
  CONSTRAINT "upward_savings_internal_ledger_reference_key" UNIQUE ("reference"),
  CONSTRAINT "upward_savings_internal_ledger_vaultId_fkey" FOREIGN KEY ("vaultId") REFERENCES "upward_rent_vault"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "upward_savings_internal_ledger_vaultId_entryDate_idx"
  ON "upward_savings_internal_ledger"("vaultId", "entryDate");
CREATE INDEX IF NOT EXISTS "upward_savings_internal_ledger_entryType_idx"
  ON "upward_savings_internal_ledger"("entryType");
CREATE INDEX IF NOT EXISTS "upward_savings_internal_ledger_productOption_idx"
  ON "upward_savings_internal_ledger"("productOption");

-- Activation Cashback Campaigns
CREATE TABLE IF NOT EXISTS "upward_savings_cashback_campaign" (
  "id" SERIAL NOT NULL,
  "uuid" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "rewardAmountKobo" BIGINT NOT NULL DEFAULT 300000,
  "budgetCapKobo" BIGINT NOT NULL DEFAULT 5000000,
  "totalDisbursedKobo" BIGINT NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "createdByAdminId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "upward_savings_cashback_campaign_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "upward_savings_cashback_campaign_uuid_key" UNIQUE ("uuid"),
  CONSTRAINT "upward_savings_cashback_campaign_code_key" UNIQUE ("code")
);

CREATE INDEX IF NOT EXISTS "upward_savings_cashback_campaign_isActive_idx"
  ON "upward_savings_cashback_campaign"("isActive");

-- Activation Cashback Grants (1 per user per campaign)
CREATE TABLE IF NOT EXISTS "upward_savings_cashback_grant" (
  "id" SERIAL NOT NULL,
  "uuid" TEXT NOT NULL,
  "campaignId" INTEGER NOT NULL,
  "userId" INTEGER NOT NULL,
  "vaultId" INTEGER NOT NULL,
  "transactionId" INTEGER,
  "amountKobo" BIGINT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'CREDITED',
  "fundingSource" TEXT NOT NULL DEFAULT 'PAYSTACK_BALANCE',
  "reference" TEXT NOT NULL,
  "grantedByAdminId" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "upward_savings_cashback_grant_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "upward_savings_cashback_grant_uuid_key" UNIQUE ("uuid"),
  CONSTRAINT "upward_savings_cashback_grant_reference_key" UNIQUE ("reference"),
  CONSTRAINT "upward_savings_cashback_grant_campaignId_userId_key" UNIQUE ("campaignId", "userId"),
  CONSTRAINT "upward_savings_cashback_grant_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "upward_savings_cashback_campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "upward_savings_cashback_grant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "upward_user"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "upward_savings_cashback_grant_vaultId_fkey" FOREIGN KEY ("vaultId") REFERENCES "upward_rent_vault"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "upward_savings_cashback_grant_campaignId_idx"
  ON "upward_savings_cashback_grant"("campaignId");
CREATE INDEX IF NOT EXISTS "upward_savings_cashback_grant_userId_idx"
  ON "upward_savings_cashback_grant"("userId");
CREATE INDEX IF NOT EXISTS "upward_savings_cashback_grant_vaultId_idx"
  ON "upward_savings_cashback_grant"("vaultId");
