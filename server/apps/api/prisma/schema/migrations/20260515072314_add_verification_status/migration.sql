-- AlterTable
ALTER TABLE "upward_user_property" ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "verificationStatus" TEXT DEFAULT 'PENDING';
