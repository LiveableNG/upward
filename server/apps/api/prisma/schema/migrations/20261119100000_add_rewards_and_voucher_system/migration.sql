-- Add signupCampaignTag to upward_user
ALTER TABLE "upward_user"
  ADD COLUMN IF NOT EXISTS "signupCampaignTag" VARCHAR(100);

CREATE INDEX IF NOT EXISTS "upward_user_signupCampaignTag_idx"
  ON "upward_user"("signupCampaignTag");

-- Create upward_reward_rule table
CREATE TABLE IF NOT EXISTS "upward_reward_rule" (
  "id" SERIAL NOT NULL,
  "uuid" TEXT NOT NULL,
  "triggerKey" VARCHAR(100) NOT NULL,
  "name" VARCHAR(150) NOT NULL,
  "description" TEXT,
  "rewardCategory" VARCHAR(30) NOT NULL DEFAULT 'VOUCHER',
  "rewardAmountKobo" BIGINT NOT NULL DEFAULT 100000,
  "minQualifyingAmountKobo" BIGINT NOT NULL DEFAULT 0,
  "maxPerUser" INTEGER NOT NULL DEFAULT 1,
  "expiryDays" INTEGER,
  "campaignTag" VARCHAR(100),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "updatedByAdminId" VARCHAR(100),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "upward_reward_rule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "upward_reward_rule_uuid_key"
  ON "upward_reward_rule"("uuid");
CREATE UNIQUE INDEX IF NOT EXISTS "upward_reward_rule_triggerKey_key"
  ON "upward_reward_rule"("triggerKey");
CREATE INDEX IF NOT EXISTS "upward_reward_rule_rewardCategory_isActive_idx"
  ON "upward_reward_rule"("rewardCategory", "isActive");
CREATE INDEX IF NOT EXISTS "upward_reward_rule_campaignTag_idx"
  ON "upward_reward_rule"("campaignTag");

-- Create upward_promotional_voucher table
CREATE TABLE IF NOT EXISTS "upward_promotional_voucher" (
  "id" SERIAL NOT NULL,
  "uuid" TEXT NOT NULL,
  "code" VARCHAR(60) NOT NULL,
  "userId" INTEGER NOT NULL,
  "amountKobo" BIGINT NOT NULL,
  "redeemedAmountKobo" BIGINT NOT NULL DEFAULT 0,
  "remainingAmountKobo" BIGINT NOT NULL,
  "currency" VARCHAR(10) NOT NULL DEFAULT 'NGN',
  "status" VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
  "sourceType" VARCHAR(50) NOT NULL,
  "triggerKey" VARCHAR(100),
  "campaignTag" VARCHAR(100),
  "reason" VARCHAR(255) NOT NULL,
  "notes" TEXT,
  "awardedByAdminId" VARCHAR(100),
  "awardedByAdminEmail" VARCHAR(150),
  "idempotencyKey" VARCHAR(150),
  "expiresAt" TIMESTAMP(3),
  "redeemedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "upward_promotional_voucher_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "upward_promotional_voucher_uuid_key"
  ON "upward_promotional_voucher"("uuid");
CREATE UNIQUE INDEX IF NOT EXISTS "upward_promotional_voucher_code_key"
  ON "upward_promotional_voucher"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "upward_promotional_voucher_idempotencyKey_key"
  ON "upward_promotional_voucher"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "upward_promotional_voucher_userId_status_idx"
  ON "upward_promotional_voucher"("userId", "status");
CREATE INDEX IF NOT EXISTS "upward_promotional_voucher_sourceType_idx"
  ON "upward_promotional_voucher"("sourceType");
CREATE INDEX IF NOT EXISTS "upward_promotional_voucher_campaignTag_idx"
  ON "upward_promotional_voucher"("campaignTag");
CREATE INDEX IF NOT EXISTS "upward_promotional_voucher_triggerKey_idx"
  ON "upward_promotional_voucher"("triggerKey");
CREATE INDEX IF NOT EXISTS "upward_promotional_voucher_createdAt_idx"
  ON "upward_promotional_voucher"("createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'upward_promotional_voucher_userId_fkey'
  ) THEN
    ALTER TABLE "upward_promotional_voucher"
      ADD CONSTRAINT "upward_promotional_voucher_userId_fkey"
      FOREIGN KEY ("userId")
      REFERENCES "upward_user"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Create upward_voucher_redemption table
CREATE TABLE IF NOT EXISTS "upward_voucher_redemption" (
  "id" SERIAL NOT NULL,
  "uuid" TEXT NOT NULL,
  "voucherId" INTEGER NOT NULL,
  "userId" INTEGER NOT NULL,
  "orderId" INTEGER,
  "orderNumber" VARCHAR(50),
  "amountDeductedKobo" BIGINT NOT NULL,
  "status" VARCHAR(30) NOT NULL DEFAULT 'APPLIED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "upward_voucher_redemption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "upward_voucher_redemption_uuid_key"
  ON "upward_voucher_redemption"("uuid");
CREATE INDEX IF NOT EXISTS "upward_voucher_redemption_voucherId_idx"
  ON "upward_voucher_redemption"("voucherId");
CREATE INDEX IF NOT EXISTS "upward_voucher_redemption_userId_idx"
  ON "upward_voucher_redemption"("userId");
CREATE INDEX IF NOT EXISTS "upward_voucher_redemption_orderId_idx"
  ON "upward_voucher_redemption"("orderId");
CREATE INDEX IF NOT EXISTS "upward_voucher_redemption_status_idx"
  ON "upward_voucher_redemption"("status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'upward_voucher_redemption_voucherId_fkey'
  ) THEN
    ALTER TABLE "upward_voucher_redemption"
      ADD CONSTRAINT "upward_voucher_redemption_voucherId_fkey"
      FOREIGN KEY ("voucherId")
      REFERENCES "upward_promotional_voucher"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'upward_voucher_redemption_userId_fkey'
  ) THEN
    ALTER TABLE "upward_voucher_redemption"
      ADD CONSTRAINT "upward_voucher_redemption_userId_fkey"
      FOREIGN KEY ("userId")
      REFERENCES "upward_user"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'upward_voucher_redemption_orderId_fkey'
  ) THEN
    ALTER TABLE "upward_voucher_redemption"
      ADD CONSTRAINT "upward_voucher_redemption_orderId_fkey"
      FOREIGN KEY ("orderId")
      REFERENCES "upward_commerce_order"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Create upward_cashback_pool table
CREATE TABLE IF NOT EXISTS "upward_cashback_pool" (
  "id" SERIAL NOT NULL,
  "key" VARCHAR(50) NOT NULL DEFAULT 'DEFAULT_POOL',
  "availableBalanceKobo" BIGINT NOT NULL DEFAULT 5000000000,
  "totalDisbursedKobo" BIGINT NOT NULL DEFAULT 0,
  "currency" VARCHAR(10) NOT NULL DEFAULT 'NGN',
  "updatedByAdminId" VARCHAR(100),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "upward_cashback_pool_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "upward_cashback_pool_key_key"
  ON "upward_cashback_pool"("key");

-- Create upward_cashback_reward table
CREATE TABLE IF NOT EXISTS "upward_cashback_reward" (
  "id" SERIAL NOT NULL,
  "uuid" TEXT NOT NULL,
  "userId" INTEGER NOT NULL,
  "vaultId" INTEGER,
  "amountKobo" BIGINT NOT NULL,
  "currency" VARCHAR(10) NOT NULL DEFAULT 'NGN',
  "triggerKey" VARCHAR(100) NOT NULL,
  "qualifyingActivityAmountKobo" BIGINT,
  "reason" VARCHAR(255) NOT NULL,
  "status" VARCHAR(30) NOT NULL DEFAULT 'CREDITED_TO_VAULT',
  "awardedByAdminId" VARCHAR(100),
  "awardedByAdminEmail" VARCHAR(150),
  "idempotencyKey" VARCHAR(150),
  "reference" VARCHAR(100) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "upward_cashback_reward_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "upward_cashback_reward_uuid_key"
  ON "upward_cashback_reward"("uuid");
CREATE UNIQUE INDEX IF NOT EXISTS "upward_cashback_reward_idempotencyKey_key"
  ON "upward_cashback_reward"("idempotencyKey");
CREATE UNIQUE INDEX IF NOT EXISTS "upward_cashback_reward_reference_key"
  ON "upward_cashback_reward"("reference");
CREATE INDEX IF NOT EXISTS "upward_cashback_reward_userId_idx"
  ON "upward_cashback_reward"("userId");
CREATE INDEX IF NOT EXISTS "upward_cashback_reward_vaultId_idx"
  ON "upward_cashback_reward"("vaultId");
CREATE INDEX IF NOT EXISTS "upward_cashback_reward_triggerKey_idx"
  ON "upward_cashback_reward"("triggerKey");
CREATE INDEX IF NOT EXISTS "upward_cashback_reward_createdAt_idx"
  ON "upward_cashback_reward"("createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'upward_cashback_reward_userId_fkey'
  ) THEN
    ALTER TABLE "upward_cashback_reward"
      ADD CONSTRAINT "upward_cashback_reward_userId_fkey"
      FOREIGN KEY ("userId")
      REFERENCES "upward_user"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
