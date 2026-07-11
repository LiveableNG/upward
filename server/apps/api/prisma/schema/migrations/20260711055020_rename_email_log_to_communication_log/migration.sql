/*
  Warnings:

  - You are about to drop the `upward_email_log` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "upward_email_log" DROP CONSTRAINT "upward_email_log_registeredUserId_fkey";

-- DropForeignKey
ALTER TABLE "upward_email_log" DROP CONSTRAINT "upward_email_log_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "upward_email_log" DROP CONSTRAINT "upward_email_log_userId_fkey";

-- Rename Table
ALTER TABLE "upward_email_log" RENAME TO "upward_communication_log";

-- Add New Columns
ALTER TABLE "upward_communication_log" ADD COLUMN "channel" TEXT NOT NULL DEFAULT 'EMAIL';
ALTER TABLE "upward_communication_log" ADD COLUMN "recipient" TEXT;

-- Rename Primary Key
ALTER TABLE "upward_communication_log" RENAME CONSTRAINT "upward_email_log_pkey" TO "upward_communication_log_pkey";

-- Rename Existing Indices
ALTER INDEX "upward_email_log_userId_idx" RENAME TO "upward_communication_log_userId_idx";
ALTER INDEX "upward_email_log_registeredUserId_idx" RENAME TO "upward_communication_log_registeredUserId_idx";
ALTER INDEX "upward_email_log_sessionId_idx" RENAME TO "upward_communication_log_sessionId_idx";
ALTER INDEX "upward_email_log_status_idx" RENAME TO "upward_communication_log_status_idx";
ALTER INDEX "upward_email_log_type_idx" RENAME TO "upward_communication_log_type_idx";

-- Create Index for the new column
CREATE INDEX "upward_communication_log_channel_idx" ON "upward_communication_log"("channel");

-- AddForeignKey
ALTER TABLE "upward_communication_log" ADD CONSTRAINT "upward_communication_log_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "upward_session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_communication_log" ADD CONSTRAINT "upward_communication_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "upward_waitlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_communication_log" ADD CONSTRAINT "upward_communication_log_registeredUserId_fkey" FOREIGN KEY ("registeredUserId") REFERENCES "upward_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
