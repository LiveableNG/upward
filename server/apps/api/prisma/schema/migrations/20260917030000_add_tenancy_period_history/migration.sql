-- CreateTable
CREATE TABLE "upward_tenancy_period" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "userPropertyId" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "rentAmount" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "sequenceNumber" INTEGER NOT NULL DEFAULT 1,
    "isInitial" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_tenancy_period_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "upward_platform_rent_payment" ADD COLUMN "tenancyPeriodId" INTEGER;

-- AlterTable
ALTER TABLE "upward_payment_request" ADD COLUMN "tenancyPeriodId" INTEGER;

-- AlterTable
ALTER TABLE "upward_transaction" ADD COLUMN "tenancyPeriodId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "upward_tenancy_period_uuid_key" ON "upward_tenancy_period"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "upward_tenancy_period_userPropertyId_startDate_endDate_key" ON "upward_tenancy_period"("userPropertyId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "upward_tenancy_period_userPropertyId_idx" ON "upward_tenancy_period"("userPropertyId");

-- CreateIndex
CREATE INDEX "upward_tenancy_period_userPropertyId_startDate_idx" ON "upward_tenancy_period"("userPropertyId", "startDate");

-- CreateIndex
CREATE INDEX "upward_tenancy_period_userPropertyId_endDate_idx" ON "upward_tenancy_period"("userPropertyId", "endDate");

-- CreateIndex
CREATE INDEX "upward_platform_rent_payment_tenancyPeriodId_idx" ON "upward_platform_rent_payment"("tenancyPeriodId");

-- CreateIndex
CREATE INDEX "upward_payment_request_tenancyPeriodId_idx" ON "upward_payment_request"("tenancyPeriodId");

-- CreateIndex
CREATE INDEX "upward_transaction_tenancyPeriodId_idx" ON "upward_transaction"("tenancyPeriodId");

-- AddForeignKey
ALTER TABLE "upward_tenancy_period" ADD CONSTRAINT "upward_tenancy_period_userPropertyId_fkey" FOREIGN KEY ("userPropertyId") REFERENCES "upward_user_property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_platform_rent_payment" ADD CONSTRAINT "upward_platform_rent_payment_tenancyPeriodId_fkey" FOREIGN KEY ("tenancyPeriodId") REFERENCES "upward_tenancy_period"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_payment_request" ADD CONSTRAINT "upward_payment_request_tenancyPeriodId_fkey" FOREIGN KEY ("tenancyPeriodId") REFERENCES "upward_tenancy_period"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_transaction" ADD CONSTRAINT "upward_transaction_tenancyPeriodId_fkey" FOREIGN KEY ("tenancyPeriodId") REFERENCES "upward_tenancy_period"("id") ON DELETE SET NULL ON UPDATE CASCADE;
