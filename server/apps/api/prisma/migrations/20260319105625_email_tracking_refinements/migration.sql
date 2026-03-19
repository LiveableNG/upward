-- AlterTable
ALTER TABLE "upward_email_log" ALTER COLUMN "sentAt" DROP NOT NULL,
ALTER COLUMN "sentAt" DROP DEFAULT;
