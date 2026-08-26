-- AlterTable
ALTER TABLE "upward_user" ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "termsVersion" TEXT DEFAULT '2026-08-24';
