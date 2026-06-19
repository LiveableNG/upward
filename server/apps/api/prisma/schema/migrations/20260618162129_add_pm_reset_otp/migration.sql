-- AlterTable
ALTER TABLE "upward_property_manager" ADD COLUMN     "resetPasswordExpires" TIMESTAMP(3),
ADD COLUMN     "resetPasswordOTP" TEXT;
