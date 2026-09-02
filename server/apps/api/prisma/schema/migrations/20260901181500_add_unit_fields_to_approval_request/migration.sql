-- AlterTable
ALTER TABLE "upward_pm_approval_request" ADD COLUMN IF NOT EXISTS "unitUuid" TEXT;
ALTER TABLE "upward_pm_approval_request" ADD COLUMN IF NOT EXISTS "unitName" TEXT;
