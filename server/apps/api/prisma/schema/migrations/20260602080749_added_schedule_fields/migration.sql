-- AlterTable
ALTER TABLE "upward_pm_payment_request" ADD COLUMN     "isRecurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "recurrenceInterval" TEXT,
ADD COLUMN     "scheduledAt" TIMESTAMP(3);
