/*
  Warnings:

  - Added the required column `updatedAt` to the `upward_email_log` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "upward_email_log" ADD COLUMN     "email" TEXT,
ADD COLUMN     "lastError" TEXT,
ADD COLUMN     "mailgunId" TEXT,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'GENERIC',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "upward_waitlist" ADD COLUMN     "confirmationEmailError" TEXT,
ADD COLUMN     "confirmationEmailRetries" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "confirmationEmailStatus" TEXT;

-- CreateIndex
CREATE INDEX "upward_email_log_status_idx" ON "upward_email_log"("status");

-- CreateIndex
CREATE INDEX "upward_email_log_type_idx" ON "upward_email_log"("type");

-- CreateIndex
CREATE INDEX "upward_waitlist_confirmationEmailStatus_idx" ON "upward_waitlist"("confirmationEmailStatus");
