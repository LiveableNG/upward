-- AlterTable
ALTER TABLE "upward_commerce_order" ADD COLUMN "idempotencyKey" VARCHAR(100);

-- AlterTable
ALTER TABLE "upward_commerce_payment_attempt" ADD COLUMN "currency" VARCHAR(10) NOT NULL DEFAULT 'NGN',
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "upward_commerce_order_idempotencyKey_key" ON "upward_commerce_order"("idempotencyKey");

-- CreateIndex
CREATE INDEX "upward_commerce_order_idempotencyKey_idx" ON "upward_commerce_order"("idempotencyKey");

-- CreateIndex
CREATE INDEX "upward_commerce_payment_attempt_status_idx" ON "upward_commerce_payment_attempt"("status");
