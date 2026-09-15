-- CreateTable
CREATE TABLE "upward_rent_deposit_balance" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "userPropertyId" INTEGER NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_rent_deposit_balance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_rent_deposit_transaction" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "depositBalanceId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "userPropertyId" INTEGER NOT NULL,
    "paymentRequestId" INTEGER,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "balanceBefore" DOUBLE PRECISION NOT NULL,
    "balanceAfter" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "reference" TEXT NOT NULL,
    "narration" TEXT,
    "receiptUrl" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_rent_deposit_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "upward_rent_deposit_balance_uuid_key" ON "upward_rent_deposit_balance"("uuid");

-- CreateIndex
CREATE INDEX "upward_rent_deposit_balance_userId_idx" ON "upward_rent_deposit_balance"("userId");

-- CreateIndex
CREATE INDEX "upward_rent_deposit_balance_userPropertyId_idx" ON "upward_rent_deposit_balance"("userPropertyId");

-- CreateIndex
CREATE UNIQUE INDEX "upward_rent_deposit_balance_userId_userPropertyId_key" ON "upward_rent_deposit_balance"("userId", "userPropertyId");

-- CreateIndex
CREATE UNIQUE INDEX "upward_rent_deposit_transaction_uuid_key" ON "upward_rent_deposit_transaction"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "upward_rent_deposit_transaction_reference_key" ON "upward_rent_deposit_transaction"("reference");

-- CreateIndex
CREATE INDEX "upward_rent_deposit_transaction_depositBalanceId_idx" ON "upward_rent_deposit_transaction"("depositBalanceId");

-- CreateIndex
CREATE INDEX "upward_rent_deposit_transaction_userId_idx" ON "upward_rent_deposit_transaction"("userId");

-- CreateIndex
CREATE INDEX "upward_rent_deposit_transaction_userPropertyId_idx" ON "upward_rent_deposit_transaction"("userPropertyId");

-- CreateIndex
CREATE INDEX "upward_rent_deposit_transaction_reference_idx" ON "upward_rent_deposit_transaction"("reference");

-- CreateIndex
CREATE INDEX "upward_rent_deposit_transaction_paymentRequestId_idx" ON "upward_rent_deposit_transaction"("paymentRequestId");

-- AddForeignKey
ALTER TABLE "upward_rent_deposit_balance" ADD CONSTRAINT "upward_rent_deposit_balance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "upward_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_rent_deposit_balance" ADD CONSTRAINT "upward_rent_deposit_balance_userPropertyId_fkey" FOREIGN KEY ("userPropertyId") REFERENCES "upward_user_property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_rent_deposit_transaction" ADD CONSTRAINT "upward_rent_deposit_transaction_depositBalanceId_fkey" FOREIGN KEY ("depositBalanceId") REFERENCES "upward_rent_deposit_balance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_rent_deposit_transaction" ADD CONSTRAINT "upward_rent_deposit_transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "upward_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_rent_deposit_transaction" ADD CONSTRAINT "upward_rent_deposit_transaction_userPropertyId_fkey" FOREIGN KEY ("userPropertyId") REFERENCES "upward_user_property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_rent_deposit_transaction" ADD CONSTRAINT "upward_rent_deposit_transaction_paymentRequestId_fkey" FOREIGN KEY ("paymentRequestId") REFERENCES "upward_payment_request"("id") ON DELETE SET NULL ON UPDATE CASCADE;
