-- AlterTable
ALTER TABLE "upward_payment_request" ADD COLUMN IF NOT EXISTS "inheritedTimeliness" TEXT DEFAULT 'ON_TIME';

-- CreateTable
CREATE TABLE IF NOT EXISTS "upward_tenant_join_request" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "ownerPmId" INTEGER,
    "userId" INTEGER NOT NULL,
    "userPropertyId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "address" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "subarea" TEXT,
    "state" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'Nigeria',
    "rentAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rentType" TEXT NOT NULL DEFAULT 'Annually',
    "rentStartDate" TIMESTAMP(3) NOT NULL,
    "rentEndDate" TIMESTAMP(3) NOT NULL,
    "tenancyStatus" TEXT NOT NULL DEFAULT 'NEW_CYCLE',
    "initialAmountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "onboardingProofUrl" TEXT,
    "onboardingProofFileName" TEXT,
    "onboardingProofFileType" TEXT,
    "onboardingProofFileSize" INTEGER,
    "receiptDecision" TEXT,
    "timeliness" TEXT,
    "rejectionReason" TEXT,
    "assignedUnitUuid" TEXT,
    "assignedTenantUuid" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_tenant_join_request_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "upward_tenant_join_request_uuid_key" ON "upward_tenant_join_request"("uuid");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "upward_tenant_join_request_ownerPmId_idx" ON "upward_tenant_join_request"("ownerPmId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "upward_tenant_join_request_userId_idx" ON "upward_tenant_join_request"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "upward_tenant_join_request_userPropertyId_idx" ON "upward_tenant_join_request"("userPropertyId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "upward_tenant_join_request_status_idx" ON "upward_tenant_join_request"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "upward_tenant_join_request_createdAt_idx" ON "upward_tenant_join_request"("createdAt");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'upward_tenant_join_request_ownerPmId_fkey'
  ) THEN
    ALTER TABLE "upward_tenant_join_request" ADD CONSTRAINT "upward_tenant_join_request_ownerPmId_fkey" 
      FOREIGN KEY ("ownerPmId") REFERENCES "upward_property_manager"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'upward_tenant_join_request_userId_fkey'
  ) THEN
    ALTER TABLE "upward_tenant_join_request" ADD CONSTRAINT "upward_tenant_join_request_userId_fkey" 
      FOREIGN KEY ("userId") REFERENCES "upward_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'upward_tenant_join_request_userPropertyId_fkey'
  ) THEN
    ALTER TABLE "upward_tenant_join_request" ADD CONSTRAINT "upward_tenant_join_request_userPropertyId_fkey" 
      FOREIGN KEY ("userPropertyId") REFERENCES "upward_user_property"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
