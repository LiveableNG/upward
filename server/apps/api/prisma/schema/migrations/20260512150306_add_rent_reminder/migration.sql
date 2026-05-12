-- AlterTable
ALTER TABLE "upward_payment_request" ADD COLUMN     "nextReminderAt" TIMESTAMP(3),
ADD COLUMN     "reminderCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reminderFrequency" TEXT NOT NULL DEFAULT 'NONE';

-- AlterTable
ALTER TABLE "upward_pm_payment_request" ADD COLUMN     "nextReminderAt" TIMESTAMP(3),
ADD COLUMN     "reminderCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reminderFrequency" TEXT NOT NULL DEFAULT 'NONE';
