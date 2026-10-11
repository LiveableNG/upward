-- AlterTable upward_payment_request
ALTER TABLE "upward_payment_request" ADD COLUMN IF NOT EXISTS "settlementAccountId" INTEGER;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "upward_payment_request_settlementAccountId_idx" ON "upward_payment_request"("settlementAccountId");

-- AddForeignKey
ALTER TABLE "upward_payment_request" DROP CONSTRAINT IF EXISTS "upward_payment_request_settlementAccountId_fkey";
ALTER TABLE "upward_payment_request" ADD CONSTRAINT "upward_payment_request_settlementAccountId_fkey" FOREIGN KEY ("settlementAccountId") REFERENCES "upward_settlement_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable upward_pm_payment_request
ALTER TABLE "upward_pm_payment_request" ADD COLUMN IF NOT EXISTS "settlementAccountId" INTEGER;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "upward_pm_payment_request_settlementAccountId_idx" ON "upward_pm_payment_request"("settlementAccountId");

-- AddForeignKey
ALTER TABLE "upward_pm_payment_request" DROP CONSTRAINT IF EXISTS "upward_pm_payment_request_settlementAccountId_fkey";
ALTER TABLE "upward_pm_payment_request" ADD CONSTRAINT "upward_pm_payment_request_settlementAccountId_fkey" FOREIGN KEY ("settlementAccountId") REFERENCES "upward_settlement_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
