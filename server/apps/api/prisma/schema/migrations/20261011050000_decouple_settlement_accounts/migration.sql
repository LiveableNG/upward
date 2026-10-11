-- CreateTable
CREATE TABLE IF NOT EXISTS "upward_settlement_account" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "manualAccountId" INTEGER NOT NULL,
    "pmId" INTEGER,
    "externalCompanyId" INTEGER,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upward_settlement_account_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "upward_settlement_account_uuid_key" ON "upward_settlement_account"("uuid");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "upward_settlement_account_pmId_idx" ON "upward_settlement_account"("pmId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "upward_settlement_account_externalCompanyId_idx" ON "upward_settlement_account"("externalCompanyId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "upward_settlement_account_manualAccountId_idx" ON "upward_settlement_account"("manualAccountId");

-- AddForeignKey
ALTER TABLE "upward_settlement_account" DROP CONSTRAINT IF EXISTS "upward_settlement_account_manualAccountId_fkey";
ALTER TABLE "upward_settlement_account" ADD CONSTRAINT "upward_settlement_account_manualAccountId_fkey" FOREIGN KEY ("manualAccountId") REFERENCES "upward_manual_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_settlement_account" DROP CONSTRAINT IF EXISTS "upward_settlement_account_pmId_fkey";
ALTER TABLE "upward_settlement_account" ADD CONSTRAINT "upward_settlement_account_pmId_fkey" FOREIGN KEY ("pmId") REFERENCES "upward_property_manager"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_settlement_account" DROP CONSTRAINT IF EXISTS "upward_settlement_account_externalCompanyId_fkey";
ALTER TABLE "upward_settlement_account" ADD CONSTRAINT "upward_settlement_account_externalCompanyId_fkey" FOREIGN KEY ("externalCompanyId") REFERENCES "upward_company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable upward_pm_property
ALTER TABLE "upward_pm_property" ADD COLUMN IF NOT EXISTS "settlementAccountId" INTEGER;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "upward_pm_property_settlementAccountId_idx" ON "upward_pm_property"("settlementAccountId");

-- AddForeignKey
ALTER TABLE "upward_pm_property" DROP CONSTRAINT IF EXISTS "upward_pm_property_settlementAccountId_fkey";
ALTER TABLE "upward_pm_property" ADD CONSTRAINT "upward_pm_property_settlementAccountId_fkey" FOREIGN KEY ("settlementAccountId") REFERENCES "upward_settlement_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
