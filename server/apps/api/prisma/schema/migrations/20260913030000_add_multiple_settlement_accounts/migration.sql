-- DropForeignKey
ALTER TABLE "upward_manual_account" DROP CONSTRAINT IF EXISTS "upward_manual_account_pmPropertyId_fkey";
ALTER TABLE "upward_manual_account" DROP CONSTRAINT IF EXISTS "upward_manual_account_userPropertyId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "upward_manual_account_pmPropertyId_key";
DROP INDEX IF EXISTS "upward_manual_account_userPropertyId_key";

-- AlterTable upward_manual_account
ALTER TABLE "upward_manual_account" DROP COLUMN IF EXISTS "pmPropertyId",
DROP COLUMN IF EXISTS "userPropertyId",
ADD COLUMN IF NOT EXISTS "isPrimary" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "pmId" INTEGER;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "upward_manual_account_pmId_idx" ON "upward_manual_account"("pmId");

-- AlterTable upward_pm_property
ALTER TABLE "upward_pm_property" ADD COLUMN IF NOT EXISTS "manualAccountId" INTEGER;

-- AlterTable upward_user_property
ALTER TABLE "upward_user_property" ADD COLUMN IF NOT EXISTS "manualAccountId" INTEGER;

-- AlterTable upward_pm_payment_request
ALTER TABLE "upward_pm_payment_request" ADD COLUMN IF NOT EXISTS "manualAccountId" INTEGER;

-- AlterTable upward_payment_request
ALTER TABLE "upward_payment_request" ADD COLUMN IF NOT EXISTS "manualAccountId" INTEGER;

-- AddForeignKey
ALTER TABLE "upward_pm_property" ADD CONSTRAINT "upward_pm_property_manualAccountId_fkey" FOREIGN KEY ("manualAccountId") REFERENCES "upward_manual_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_user_property" ADD CONSTRAINT "upward_user_property_manualAccountId_fkey" FOREIGN KEY ("manualAccountId") REFERENCES "upward_manual_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_pm_payment_request" ADD CONSTRAINT "upward_pm_payment_request_manualAccountId_fkey" FOREIGN KEY ("manualAccountId") REFERENCES "upward_manual_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_payment_request" ADD CONSTRAINT "upward_payment_request_manualAccountId_fkey" FOREIGN KEY ("manualAccountId") REFERENCES "upward_manual_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_manual_account" ADD CONSTRAINT "upward_manual_account_pmId_fkey" FOREIGN KEY ("pmId") REFERENCES "upward_property_manager"("id") ON DELETE CASCADE ON UPDATE CASCADE;
