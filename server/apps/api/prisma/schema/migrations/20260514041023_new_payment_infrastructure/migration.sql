-- AlterTable
ALTER TABLE "upward_transaction" ADD COLUMN     "settlementBatchId" INTEGER,
ADD COLUMN     "settlementStatus" TEXT NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "upward_dedicated_virtual_account" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "bankCode" TEXT NOT NULL,
    "accountCode" TEXT NOT NULL,
    "paystackCustomerId" TEXT NOT NULL,
    "metadata" JSONB,
    "userPropertyId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_dedicated_virtual_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_user_bank_details" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "bankCode" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_user_bank_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_settlement_batch" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "landlordId" TEXT,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "transferReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_settlement_batch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "upward_dedicated_virtual_account_uuid_key" ON "upward_dedicated_virtual_account"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "upward_dedicated_virtual_account_accountNumber_key" ON "upward_dedicated_virtual_account"("accountNumber");

-- CreateIndex
CREATE UNIQUE INDEX "upward_dedicated_virtual_account_accountCode_key" ON "upward_dedicated_virtual_account"("accountCode");

-- CreateIndex
CREATE UNIQUE INDEX "upward_dedicated_virtual_account_userPropertyId_key" ON "upward_dedicated_virtual_account"("userPropertyId");

-- CreateIndex
CREATE INDEX "upward_dedicated_virtual_account_accountNumber_idx" ON "upward_dedicated_virtual_account"("accountNumber");

-- CreateIndex
CREATE INDEX "upward_dedicated_virtual_account_userPropertyId_idx" ON "upward_dedicated_virtual_account"("userPropertyId");

-- CreateIndex
CREATE UNIQUE INDEX "upward_user_bank_details_uuid_key" ON "upward_user_bank_details"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "upward_user_bank_details_userId_key" ON "upward_user_bank_details"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "upward_settlement_batch_uuid_key" ON "upward_settlement_batch"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "upward_settlement_batch_transferReference_key" ON "upward_settlement_batch"("transferReference");

-- AddForeignKey
ALTER TABLE "upward_transaction" ADD CONSTRAINT "upward_transaction_settlementBatchId_fkey" FOREIGN KEY ("settlementBatchId") REFERENCES "upward_settlement_batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_dedicated_virtual_account" ADD CONSTRAINT "upward_dedicated_virtual_account_userPropertyId_fkey" FOREIGN KEY ("userPropertyId") REFERENCES "upward_user_property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_user_bank_details" ADD CONSTRAINT "upward_user_bank_details_userId_fkey" FOREIGN KEY ("userId") REFERENCES "upward_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
