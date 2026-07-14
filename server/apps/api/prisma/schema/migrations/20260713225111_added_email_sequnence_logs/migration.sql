-- CreateTable
CREATE TABLE "upward_email_sequence_log" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "errorReason" TEXT,
    "templateName" TEXT NOT NULL,
    "templateData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_email_sequence_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "upward_email_sequence_log_uuid_key" ON "upward_email_sequence_log"("uuid");

-- CreateIndex
CREATE INDEX "upward_email_sequence_log_userId_idx" ON "upward_email_sequence_log"("userId");

-- CreateIndex
CREATE INDEX "upward_email_sequence_log_status_scheduledFor_idx" ON "upward_email_sequence_log"("status", "scheduledFor");

-- AddForeignKey
ALTER TABLE "upward_email_sequence_log" ADD CONSTRAINT "upward_email_sequence_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "upward_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
