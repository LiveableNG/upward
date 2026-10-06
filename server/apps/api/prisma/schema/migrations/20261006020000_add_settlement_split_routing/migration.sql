-- AlterTable upward_manual_account
ALTER TABLE "upward_manual_account" ADD COLUMN IF NOT EXISTS "title" TEXT;

-- CreateTable upward_settlement_split_rule
CREATE TABLE IF NOT EXISTS "upward_settlement_split_rule" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "propertyId" INTEGER,
    "pmPaymentRequestId" INTEGER,
    "paymentRequestId" INTEGER,
    "lineItemName" TEXT NOT NULL DEFAULT 'Rent',
    "manualAccountId" INTEGER NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_settlement_split_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable upward_transaction_settlement_split
CREATE TABLE IF NOT EXISTS "upward_transaction_settlement_split" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "transactionId" INTEGER NOT NULL,
    "manualAccountId" INTEGER,
    "accountNumber" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "bankCode" TEXT NOT NULL,
    "title" TEXT,
    "lineItemName" TEXT NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "settlementStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "transferReference" TEXT,
    "batchId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_transaction_settlement_split_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "upward_settlement_split_rule_uuid_key" ON "upward_settlement_split_rule"("uuid");
CREATE INDEX IF NOT EXISTS "upward_settlement_split_rule_propertyId_idx" ON "upward_settlement_split_rule"("propertyId");
CREATE INDEX IF NOT EXISTS "upward_settlement_split_rule_pmPaymentRequestId_idx" ON "upward_settlement_split_rule"("pmPaymentRequestId");
CREATE INDEX IF NOT EXISTS "upward_settlement_split_rule_paymentRequestId_idx" ON "upward_settlement_split_rule"("paymentRequestId");
CREATE INDEX IF NOT EXISTS "upward_settlement_split_rule_manualAccountId_idx" ON "upward_settlement_split_rule"("manualAccountId");

CREATE UNIQUE INDEX IF NOT EXISTS "upward_transaction_settlement_split_uuid_key" ON "upward_transaction_settlement_split"("uuid");
CREATE INDEX IF NOT EXISTS "upward_transaction_settlement_split_transactionId_idx" ON "upward_transaction_settlement_split"("transactionId");
CREATE INDEX IF NOT EXISTS "upward_transaction_settlement_split_manualAccountId_idx" ON "upward_transaction_settlement_split"("manualAccountId");
CREATE INDEX IF NOT EXISTS "upward_transaction_settlement_split_batchId_idx" ON "upward_transaction_settlement_split"("batchId");
CREATE INDEX IF NOT EXISTS "upward_transaction_settlement_split_settlementStatus_idx" ON "upward_transaction_settlement_split"("settlementStatus");

-- AddForeignKey
ALTER TABLE "upward_settlement_split_rule" DROP CONSTRAINT IF EXISTS "upward_settlement_split_rule_propertyId_fkey";
ALTER TABLE "upward_settlement_split_rule" ADD CONSTRAINT "upward_settlement_split_rule_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "upward_pm_property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "upward_settlement_split_rule" DROP CONSTRAINT IF EXISTS "upward_settlement_split_rule_pmPaymentRequestId_fkey";
ALTER TABLE "upward_settlement_split_rule" ADD CONSTRAINT "upward_settlement_split_rule_pmPaymentRequestId_fkey" FOREIGN KEY ("pmPaymentRequestId") REFERENCES "upward_pm_payment_request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "upward_settlement_split_rule" DROP CONSTRAINT IF EXISTS "upward_settlement_split_rule_paymentRequestId_fkey";
ALTER TABLE "upward_settlement_split_rule" ADD CONSTRAINT "upward_settlement_split_rule_paymentRequestId_fkey" FOREIGN KEY ("paymentRequestId") REFERENCES "upward_payment_request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "upward_settlement_split_rule" DROP CONSTRAINT IF EXISTS "upward_settlement_split_rule_manualAccountId_fkey";
ALTER TABLE "upward_settlement_split_rule" ADD CONSTRAINT "upward_settlement_split_rule_manualAccountId_fkey" FOREIGN KEY ("manualAccountId") REFERENCES "upward_manual_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_transaction_settlement_split" DROP CONSTRAINT IF EXISTS "upward_transaction_settlement_split_transactionId_fkey";
ALTER TABLE "upward_transaction_settlement_split" ADD CONSTRAINT "upward_transaction_settlement_split_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "upward_transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "upward_transaction_settlement_split" DROP CONSTRAINT IF EXISTS "upward_transaction_settlement_split_manualAccountId_fkey";
ALTER TABLE "upward_transaction_settlement_split" ADD CONSTRAINT "upward_transaction_settlement_split_manualAccountId_fkey" FOREIGN KEY ("manualAccountId") REFERENCES "upward_manual_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "upward_transaction_settlement_split" DROP CONSTRAINT IF EXISTS "upward_transaction_settlement_split_batchId_fkey";
ALTER TABLE "upward_transaction_settlement_split" ADD CONSTRAINT "upward_transaction_settlement_split_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "upward_settlement_batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
