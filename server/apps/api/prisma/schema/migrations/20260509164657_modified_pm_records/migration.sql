-- AlterTable
ALTER TABLE "upward_payment_request" ADD COLUMN     "rentType" TEXT;

-- AlterTable
ALTER TABLE "upward_pm_payment_request" ADD COLUMN     "rentType" TEXT;

-- AlterTable
ALTER TABLE "upward_pm_rent_payment" ADD COLUMN     "tenantId" INTEGER;

-- AlterTable
ALTER TABLE "upward_user_property" ADD COLUMN     "rentType" TEXT NOT NULL DEFAULT 'Annually';

-- CreateIndex
CREATE INDEX "upward_pm_rent_payment_tenantId_idx" ON "upward_pm_rent_payment"("tenantId");

-- AddForeignKey
ALTER TABLE "upward_pm_rent_payment" ADD CONSTRAINT "upward_pm_rent_payment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "upward_pm_tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
