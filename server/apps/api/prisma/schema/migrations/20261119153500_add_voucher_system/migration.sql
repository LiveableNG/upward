-- CreateEnum
CREATE TYPE "VoucherCampaignType" AS ENUM ('SIGNUP_LINK', 'GAMING_REWARD', 'ADMIN_GRANT', 'PROMO');

-- CreateEnum
CREATE TYPE "VoucherLedgerEntryType" AS ENUM (
  'CREDIT_SIGNUP_LINK',
  'CREDIT_GAMING_REWARD',
  'CREDIT_ADMIN_GRANT',
  'RESERVE_ORDER',
  'REDEEM_ORDER',
  'RELEASE_ORDER',
  'ADMIN_REVERSAL'
);

-- AlterTable
ALTER TABLE "upward_offering" ADD COLUMN "voucherEligible" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "upward_voucher_campaign" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "type" "VoucherCampaignType" NOT NULL DEFAULT 'SIGNUP_LINK',
    "defaultAmountKobo" BIGINT NOT NULL DEFAULT 0,
    "maxBudgetKobo" BIGINT,
    "spentKobo" BIGINT NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "emailTemplateKey" VARCHAR(100),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_voucher_campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_voucher_wallet" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'NGN',
    "availableBalanceKobo" BIGINT NOT NULL DEFAULT 0,
    "reservedBalanceKobo" BIGINT NOT NULL DEFAULT 0,
    "lifetimeEarnedKobo" BIGINT NOT NULL DEFAULT 0,
    "lifetimeRedeemedKobo" BIGINT NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_voucher_wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_voucher_ledger_entry" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "walletId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" "VoucherLedgerEntryType" NOT NULL,
    "amountKobo" BIGINT NOT NULL,
    "balanceAfterKobo" BIGINT NOT NULL,
    "idempotencyKey" VARCHAR(150) NOT NULL,
    "campaignId" INTEGER,
    "orderId" INTEGER,
    "grantedByAdminId" TEXT,
    "reason" VARCHAR(255),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upward_voucher_ledger_entry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "upward_voucher_campaign_uuid_key" ON "upward_voucher_campaign"("uuid");
CREATE UNIQUE INDEX "upward_voucher_campaign_code_key" ON "upward_voucher_campaign"("code");
CREATE INDEX "upward_voucher_campaign_code_idx" ON "upward_voucher_campaign"("code");
CREATE INDEX "upward_voucher_campaign_type_isActive_idx" ON "upward_voucher_campaign"("type", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "upward_voucher_wallet_uuid_key" ON "upward_voucher_wallet"("uuid");
CREATE UNIQUE INDEX "upward_voucher_wallet_userId_key" ON "upward_voucher_wallet"("userId");
CREATE INDEX "upward_voucher_wallet_userId_idx" ON "upward_voucher_wallet"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "upward_voucher_ledger_entry_uuid_key" ON "upward_voucher_ledger_entry"("uuid");
CREATE UNIQUE INDEX "upward_voucher_ledger_entry_idempotencyKey_key" ON "upward_voucher_ledger_entry"("idempotencyKey");
CREATE INDEX "upward_voucher_ledger_entry_userId_createdAt_idx" ON "upward_voucher_ledger_entry"("userId", "createdAt");
CREATE INDEX "upward_voucher_ledger_entry_walletId_createdAt_idx" ON "upward_voucher_ledger_entry"("walletId", "createdAt");
CREATE INDEX "upward_voucher_ledger_entry_orderId_idx" ON "upward_voucher_ledger_entry"("orderId");
CREATE INDEX "upward_voucher_ledger_entry_campaignId_idx" ON "upward_voucher_ledger_entry"("campaignId");
CREATE INDEX "upward_voucher_ledger_entry_grantedByAdminId_idx" ON "upward_voucher_ledger_entry"("grantedByAdminId");

-- AddForeignKey
ALTER TABLE "upward_voucher_wallet" ADD CONSTRAINT "upward_voucher_wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "upward_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_voucher_ledger_entry" ADD CONSTRAINT "upward_voucher_ledger_entry_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "upward_voucher_wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_voucher_ledger_entry" ADD CONSTRAINT "upward_voucher_ledger_entry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "upward_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_voucher_ledger_entry" ADD CONSTRAINT "upward_voucher_ledger_entry_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "upward_voucher_campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_voucher_ledger_entry" ADD CONSTRAINT "upward_voucher_ledger_entry_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "upward_commerce_order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_voucher_ledger_entry" ADD CONSTRAINT "upward_voucher_ledger_entry_grantedByAdminId_fkey" FOREIGN KEY ("grantedByAdminId") REFERENCES "upward_admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
