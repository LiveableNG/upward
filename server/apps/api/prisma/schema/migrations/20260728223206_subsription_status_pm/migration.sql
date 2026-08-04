-- CreateEnum
CREATE TYPE "UpwardSubscriptionTier" AS ENUM ('FREE', 'TIER_2', 'TIER_3');

-- CreateEnum
CREATE TYPE "UpwardUnitBillingMode" AS ENUM ('ACTIVE', 'ALL');

-- CreateEnum
CREATE TYPE "UpwardDiscountType" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateEnum
CREATE TYPE "UpwardPaymentStatus" AS ENUM ('PAID', 'UNPAID', 'PENDING');

-- CreateTable
CREATE TABLE "upward_subscription" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "pmId" INTEGER NOT NULL,
    "tier" "UpwardSubscriptionTier" NOT NULL DEFAULT 'FREE',
    "priceYearly" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "priceMonthly" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unitBillingMode" "UpwardUnitBillingMode" NOT NULL DEFAULT 'ACTIVE',
    "discountType" "UpwardDiscountType",
    "discountValue" DOUBLE PRECISION,
    "discountStart" TIMESTAMP(3),
    "discountEnd" TIMESTAMP(3),
    "discountReason" TEXT,
    "anniversaryDate" INTEGER,
    "gracePeriodDays" INTEGER NOT NULL DEFAULT 7,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "graceStartedAt" TIMESTAMP(3),
    "isInitialDepositPaid" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_pm_wallet" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "pmId" INTEGER NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_pm_wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_pm_wallet_transaction" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "walletId" INTEGER NOT NULL,
    "pmId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "amount" DOUBLE PRECISION NOT NULL,
    "reference" TEXT,
    "narration" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_pm_wallet_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_subscription_invoice" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "pmId" INTEGER NOT NULL,
    "unitCount" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "deductionDate" TIMESTAMP(3) NOT NULL,
    "paymentStatus" "UpwardPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_subscription_invoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "upward_subscription_uuid_key" ON "upward_subscription"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "upward_subscription_pmId_key" ON "upward_subscription"("pmId");

-- CreateIndex
CREATE UNIQUE INDEX "upward_pm_wallet_uuid_key" ON "upward_pm_wallet"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "upward_pm_wallet_pmId_key" ON "upward_pm_wallet"("pmId");

-- CreateIndex
CREATE UNIQUE INDEX "upward_pm_wallet_transaction_uuid_key" ON "upward_pm_wallet_transaction"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "upward_pm_wallet_transaction_reference_key" ON "upward_pm_wallet_transaction"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "upward_subscription_invoice_uuid_key" ON "upward_subscription_invoice"("uuid");

-- AddForeignKey
ALTER TABLE "upward_subscription" ADD CONSTRAINT "upward_subscription_pmId_fkey" FOREIGN KEY ("pmId") REFERENCES "upward_property_manager"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_pm_wallet" ADD CONSTRAINT "upward_pm_wallet_pmId_fkey" FOREIGN KEY ("pmId") REFERENCES "upward_property_manager"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_pm_wallet_transaction" ADD CONSTRAINT "upward_pm_wallet_transaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "upward_pm_wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_pm_wallet_transaction" ADD CONSTRAINT "upward_pm_wallet_transaction_pmId_fkey" FOREIGN KEY ("pmId") REFERENCES "upward_property_manager"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_subscription_invoice" ADD CONSTRAINT "upward_subscription_invoice_pmId_fkey" FOREIGN KEY ("pmId") REFERENCES "upward_property_manager"("id") ON DELETE CASCADE ON UPDATE CASCADE;
