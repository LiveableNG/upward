-- AlterTable
ALTER TABLE "upward_communication_log" ADD COLUMN     "emailSequenceLogId" INTEGER;

-- AlterTable
ALTER TABLE "upward_email_sequence_log" ADD COLUMN     "isOpened" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "openCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "openedAt" TIMESTAMP(3),
ADD COLUMN     "userAgent" TEXT;

-- CreateIndex
CREATE INDEX "upward_communication_log_emailSequenceLogId_idx" ON "upward_communication_log"("emailSequenceLogId");

-- AddForeignKey
ALTER TABLE "upward_communication_log" ADD CONSTRAINT "upward_communication_log_emailSequenceLogId_fkey" FOREIGN KEY ("emailSequenceLogId") REFERENCES "upward_email_sequence_log"("id") ON DELETE SET NULL ON UPDATE CASCADE;
