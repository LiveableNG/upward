-- AlterTable
ALTER TABLE "upward_platform_rate_config" ADD COLUMN IF NOT EXISTS "savingsEnabled" BOOLEAN NOT NULL DEFAULT true;
