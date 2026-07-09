-- AlterTable
ALTER TABLE "upward_pm_tenant" ADD COLUMN     "isInternal" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "upward_property_manager" ADD COLUMN     "isInternal" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "upward_user" ADD COLUMN     "isInternal" BOOLEAN NOT NULL DEFAULT false;
