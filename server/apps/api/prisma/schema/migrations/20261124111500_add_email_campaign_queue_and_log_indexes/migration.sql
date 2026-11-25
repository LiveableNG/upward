-- CreateTable: upward_bulk_email_campaign (Postgres-backed bulk email campaign queue)
CREATE TABLE IF NOT EXISTS "upward_bulk_email_campaign" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "htmlTemplate" TEXT NOT NULL,
    "targetGroup" TEXT NOT NULL DEFAULT 'RAW',
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "idempotencyKey" TEXT,
    "totalRecipients" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_bulk_email_campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable: upward_bulk_email_recipient
CREATE TABLE IF NOT EXISTS "upward_bulk_email_recipient" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "recipientUserId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "nextRetryAt" TIMESTAMP(3),
    "lastError" TEXT,
    "mailgunId" TEXT,
    "communicationLogId" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_bulk_email_recipient_pkey" PRIMARY KEY ("id")
);

-- AlterTable: upward_communication_log
ALTER TABLE "upward_communication_log" ADD COLUMN IF NOT EXISTS "campaignId" TEXT;
ALTER TABLE "upward_communication_log" ADD COLUMN IF NOT EXISTS "retriedFromLogId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "upward_bulk_email_campaign_idempotencyKey_key" ON "upward_bulk_email_campaign"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "upward_bulk_email_campaign_status_createdAt_idx" ON "upward_bulk_email_campaign"("status", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "upward_bulk_email_campaign_createdAt_idx" ON "upward_bulk_email_campaign"("createdAt" DESC);

CREATE UNIQUE INDEX IF NOT EXISTS "upward_bulk_email_recipient_campaignId_email_key" ON "upward_bulk_email_recipient"("campaignId", "email");
CREATE INDEX IF NOT EXISTS "upward_bulk_email_recipient_status_nextRetryAt_idx" ON "upward_bulk_email_recipient"("status", "nextRetryAt");
CREATE INDEX IF NOT EXISTS "upward_bulk_email_recipient_campaignId_status_idx" ON "upward_bulk_email_recipient"("campaignId", "status");

CREATE INDEX IF NOT EXISTS "upward_communication_log_campaignId_status_idx" ON "upward_communication_log"("campaignId", "status");
CREATE INDEX IF NOT EXISTS "upward_communication_log_status_createdAt_idx" ON "upward_communication_log"("status", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "upward_communication_log_createdAt_idx" ON "upward_communication_log"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "upward_communication_log_email_idx" ON "upward_communication_log"("email");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'upward_bulk_email_recipient_campaignId_fkey'
    ) THEN
        ALTER TABLE "upward_bulk_email_recipient"
        ADD CONSTRAINT "upward_bulk_email_recipient_campaignId_fkey"
        FOREIGN KEY ("campaignId") REFERENCES "upward_bulk_email_campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'upward_communication_log_campaignId_fkey'
    ) THEN
        ALTER TABLE "upward_communication_log"
        ADD CONSTRAINT "upward_communication_log_campaignId_fkey"
        FOREIGN KEY ("campaignId") REFERENCES "upward_bulk_email_campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
