-- AlterTable
ALTER TABLE "upward_company" ADD COLUMN     "isInternal" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "upward_waitlist" ADD COLUMN     "isInternal" BOOLEAN NOT NULL DEFAULT false;
