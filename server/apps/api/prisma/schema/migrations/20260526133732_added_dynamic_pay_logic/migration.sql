-- CreateTable
CREATE TABLE "upward_refund_log" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "transactionId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "pmId" INTEGER,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "actionBy" TEXT,
    "metadata" JSONB,
    "flaggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_refund_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_fee_override" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "fee" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_fee_override_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "upward_refund_log_uuid_key" ON "upward_refund_log"("uuid");

-- CreateIndex
CREATE INDEX "upward_refund_log_transactionId_idx" ON "upward_refund_log"("transactionId");

-- CreateIndex
CREATE INDEX "upward_refund_log_userId_idx" ON "upward_refund_log"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "upward_fee_override_uuid_key" ON "upward_fee_override"("uuid");

-- CreateIndex
CREATE INDEX "upward_fee_override_targetType_targetId_idx" ON "upward_fee_override"("targetType", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "upward_fee_override_targetType_targetId_key" ON "upward_fee_override"("targetType", "targetId");

-- AddForeignKey
ALTER TABLE "upward_refund_log" ADD CONSTRAINT "upward_refund_log_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "upward_transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_refund_log" ADD CONSTRAINT "upward_refund_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "upward_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
