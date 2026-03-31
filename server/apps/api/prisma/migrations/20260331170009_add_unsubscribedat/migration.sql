-- AlterTable
ALTER TABLE "upward_interaction" ADD COLUMN     "metadata" TEXT;

-- AlterTable
ALTER TABLE "upward_waitlist" ADD COLUMN     "unsubscribedAt" TIMESTAMP(3);
