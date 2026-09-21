-- DropIndex
DROP INDEX IF EXISTS "upward_dedicated_virtual_account_userPropertyId_key";

-- AlterTable
ALTER TABLE "upward_dedicated_virtual_account" ADD COLUMN IF NOT EXISTS "bankSlug" TEXT;
ALTER TABLE "upward_dedicated_virtual_account" ADD COLUMN IF NOT EXISTS "isDefault" BOOLEAN NOT NULL DEFAULT false;

-- Populate defaults for existing records
UPDATE "upward_dedicated_virtual_account" SET "isDefault" = true WHERE "isDefault" = false;
UPDATE "upward_dedicated_virtual_account" SET "bankSlug" = 'wema-bank' WHERE "bankSlug" IS NULL;
