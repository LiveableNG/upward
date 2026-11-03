-- AlterTable upward_property_manager
ALTER TABLE "upward_property_manager" ADD COLUMN IF NOT EXISTS "dailyBriefingEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable upward_pm_tenant
ALTER TABLE "upward_pm_tenant" ADD COLUMN IF NOT EXISTS "inviteAcceptedAt" TIMESTAMP(3);

-- Backfill inviteAcceptedAt for existing tenants who already accepted or are on upward
UPDATE "upward_pm_tenant"
SET "inviteAcceptedAt" = "updatedAt"
WHERE "inviteStatus" IN ('ACCEPTED', 'ON_UPWARD') AND "inviteAcceptedAt" IS NULL;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "upward_pm_tenant_inviteAcceptedAt_idx" ON "upward_pm_tenant"("inviteAcceptedAt");
