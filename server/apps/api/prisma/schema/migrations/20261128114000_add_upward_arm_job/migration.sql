-- Create durable ARM background operations outbox table (idempotent)
CREATE TABLE IF NOT EXISTS "upward_arm_job" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "vaultId" INTEGER,
    "userId" INTEGER,
    "transactionId" INTEGER,
    "amountKobo" BIGINT,
    "reference" TEXT NOT NULL,
    "armTransactionId" TEXT NOT NULL,
    "armInstructionId" TEXT,
    "payload" JSONB NOT NULL,
    "result" JSONB,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "lastError" TEXT,
    "lockedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "notifiedUserAt" TIMESTAMP(3),
    "notifiedAdminAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upward_arm_job_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "upward_arm_job_uuid_key"
    ON "upward_arm_job"("uuid");

CREATE UNIQUE INDEX IF NOT EXISTS "upward_arm_job_idempotencyKey_key"
    ON "upward_arm_job"("idempotencyKey");

CREATE UNIQUE INDEX IF NOT EXISTS "upward_arm_job_armTransactionId_key"
    ON "upward_arm_job"("armTransactionId");

CREATE INDEX IF NOT EXISTS "upward_arm_job_status_createdAt_idx"
    ON "upward_arm_job"("status", "createdAt");

CREATE INDEX IF NOT EXISTS "upward_arm_job_status_lockedAt_idx"
    ON "upward_arm_job"("status", "lockedAt");

CREATE INDEX IF NOT EXISTS "upward_arm_job_vaultId_idx"
    ON "upward_arm_job"("vaultId");

CREATE INDEX IF NOT EXISTS "upward_arm_job_userId_idx"
    ON "upward_arm_job"("userId");

CREATE INDEX IF NOT EXISTS "upward_arm_job_reference_idx"
    ON "upward_arm_job"("reference");

CREATE INDEX IF NOT EXISTS "upward_arm_job_transactionId_idx"
    ON "upward_arm_job"("transactionId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'upward_arm_job_vaultId_fkey'
    ) THEN
        ALTER TABLE "upward_arm_job"
            ADD CONSTRAINT "upward_arm_job_vaultId_fkey"
            FOREIGN KEY ("vaultId") REFERENCES "upward_rent_vault"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'upward_arm_job_userId_fkey'
    ) THEN
        ALTER TABLE "upward_arm_job"
            ADD CONSTRAINT "upward_arm_job_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "upward_user"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'upward_arm_job_transactionId_fkey'
    ) THEN
        ALTER TABLE "upward_arm_job"
            ADD CONSTRAINT "upward_arm_job_transactionId_fkey"
            FOREIGN KEY ("transactionId") REFERENCES "upward_rent_vault_transaction"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Align default Save & Earn annual rate with Prisma schema (14.0 -> 16.0)
ALTER TABLE "upward_platform_rate_config"
    ALTER COLUMN "savingsAnnualRatePct" SET DEFAULT 16.0;

ALTER TABLE "upward_rent_vault"
    ALTER COLUMN "appliedAnnualRatePct" SET DEFAULT 16.0;
