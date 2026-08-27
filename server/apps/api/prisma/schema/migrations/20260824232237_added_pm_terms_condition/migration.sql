-- AlterTable
ALTER TABLE "upward_property_manager" ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "termsVersion" TEXT DEFAULT '2026-08-24';
