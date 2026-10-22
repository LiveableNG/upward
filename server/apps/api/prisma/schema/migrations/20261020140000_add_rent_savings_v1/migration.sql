-- CreateTable
CREATE TABLE IF NOT EXISTS "upward_rent_vault" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "targetAmountKobo" BIGINT NOT NULL,
    "currentPrincipalKobo" BIGINT NOT NULL DEFAULT 0,
    "accruedYieldKobo" BIGINT NOT NULL DEFAULT 0,
    "cadence" TEXT NOT NULL DEFAULT 'MONTHLY',
    "contractualDueDate" TIMESTAMP(3) NOT NULL,
    "unlockDate" TIMESTAMP(3) NOT NULL,
    "lockStatus" TEXT NOT NULL DEFAULT 'LOCKED',
    "preferredFundingMethod" TEXT NOT NULL DEFAULT 'DVA',
    "paydayDayOfMonth" INTEGER,
    "cardAuthorizationCode" TEXT,
    "dvaBankName" TEXT,
    "dvaAccountNumber" TEXT,
    "dvaAccountName" TEXT,
    "dvaCustomerCode" TEXT,
    "dvaAssignmentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "autoBypassPmApproval" BOOLEAN NOT NULL DEFAULT true,
    "investmentProvider" TEXT NOT NULL DEFAULT 'ARM',
    "providerMembershipId" TEXT,
    "providerAccountNumber" TEXT,
    "providerCrmStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upward_rent_vault_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "upward_rent_vault_transaction" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "vaultId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "amountKobo" BIGINT NOT NULL,
    "principalDeltaKobo" BIGINT NOT NULL DEFAULT 0,
    "yieldDeltaKobo" BIGINT NOT NULL DEFAULT 0,
    "balanceAfterKobo" BIGINT NOT NULL,
    "reference" TEXT NOT NULL,
    "channel" TEXT,
    "narration" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upward_rent_vault_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "upward_rent_advance" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "vaultId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "borrowedAmountKobo" BIGINT NOT NULL,
    "facilityFeeKobo" BIGINT NOT NULL,
    "totalRepayableKobo" BIGINT NOT NULL,
    "repaymentDueDate" TIMESTAMP(3) NOT NULL,
    "latePenaltiesKobo" BIGINT NOT NULL DEFAULT 0,
    "amountRepaidKobo" BIGINT NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "destinationBankCode" TEXT NOT NULL,
    "destinationAccountNumber" TEXT NOT NULL,
    "destinationAccountName" TEXT,
    "payoutTransferReference" TEXT,
    "repaidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upward_rent_advance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "upward_rent_settlement" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "vaultId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "landlordBankCode" TEXT NOT NULL,
    "landlordAccountNumber" TEXT NOT NULL,
    "landlordName" TEXT NOT NULL,
    "propertyAddress" TEXT,
    "amountPaidToLandlordKobo" BIGINT NOT NULL,
    "cashbackCreditedKobo" BIGINT NOT NULL DEFAULT 0,
    "earlyBirdMultiplierApplied" BOOLEAN NOT NULL DEFAULT false,
    "nipSessionId" TEXT,
    "settlementReference" TEXT NOT NULL,
    "receiptPdfUrl" TEXT,
    "settlementStatus" TEXT NOT NULL DEFAULT 'PAID',
    "smsAlertDispatched" BOOLEAN NOT NULL DEFAULT false,
    "disburseSurplusToWallet" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upward_rent_settlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "upward_rent_savings_score" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "vaultId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "cadencePoints" INTEGER NOT NULL DEFAULT 0,
    "velocityPoints" INTEGER NOT NULL DEFAULT 0,
    "loanDisciplinePoints" INTEGER NOT NULL DEFAULT 20,
    "totalScore" INTEGER NOT NULL DEFAULT 20,
    "historyLog" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upward_rent_savings_score_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "upward_rent_vault_uuid_key" ON "upward_rent_vault"("uuid");
CREATE INDEX IF NOT EXISTS "upward_rent_vault_userId_idx" ON "upward_rent_vault"("userId");
CREATE INDEX IF NOT EXISTS "upward_rent_vault_lockStatus_idx" ON "upward_rent_vault"("lockStatus");
CREATE INDEX IF NOT EXISTS "upward_rent_vault_dvaAccountNumber_idx" ON "upward_rent_vault"("dvaAccountNumber");
CREATE INDEX IF NOT EXISTS "upward_rent_vault_contractualDueDate_idx" ON "upward_rent_vault"("contractualDueDate");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "upward_rent_vault_transaction_uuid_key" ON "upward_rent_vault_transaction"("uuid");
CREATE UNIQUE INDEX IF NOT EXISTS "upward_rent_vault_transaction_reference_key" ON "upward_rent_vault_transaction"("reference");
CREATE INDEX IF NOT EXISTS "upward_rent_vault_transaction_vaultId_idx" ON "upward_rent_vault_transaction"("vaultId");
CREATE INDEX IF NOT EXISTS "upward_rent_vault_transaction_userId_idx" ON "upward_rent_vault_transaction"("userId");
CREATE INDEX IF NOT EXISTS "upward_rent_vault_transaction_type_idx" ON "upward_rent_vault_transaction"("type");
CREATE INDEX IF NOT EXISTS "upward_rent_vault_transaction_reference_idx" ON "upward_rent_vault_transaction"("reference");
CREATE INDEX IF NOT EXISTS "upward_rent_vault_transaction_createdAt_idx" ON "upward_rent_vault_transaction"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "upward_rent_advance_uuid_key" ON "upward_rent_advance"("uuid");
CREATE INDEX IF NOT EXISTS "upward_rent_advance_vaultId_idx" ON "upward_rent_advance"("vaultId");
CREATE INDEX IF NOT EXISTS "upward_rent_advance_userId_idx" ON "upward_rent_advance"("userId");
CREATE INDEX IF NOT EXISTS "upward_rent_advance_status_idx" ON "upward_rent_advance"("status");
CREATE INDEX IF NOT EXISTS "upward_rent_advance_repaymentDueDate_idx" ON "upward_rent_advance"("repaymentDueDate");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "upward_rent_settlement_uuid_key" ON "upward_rent_settlement"("uuid");
CREATE UNIQUE INDEX IF NOT EXISTS "upward_rent_settlement_settlementReference_key" ON "upward_rent_settlement"("settlementReference");
CREATE INDEX IF NOT EXISTS "upward_rent_settlement_vaultId_idx" ON "upward_rent_settlement"("vaultId");
CREATE INDEX IF NOT EXISTS "upward_rent_settlement_userId_idx" ON "upward_rent_settlement"("userId");
CREATE INDEX IF NOT EXISTS "upward_rent_settlement_settlementReference_idx" ON "upward_rent_settlement"("settlementReference");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "upward_rent_savings_score_uuid_key" ON "upward_rent_savings_score"("uuid");
CREATE UNIQUE INDEX IF NOT EXISTS "upward_rent_savings_score_vaultId_key" ON "upward_rent_savings_score"("vaultId");
CREATE INDEX IF NOT EXISTS "upward_rent_savings_score_userId_idx" ON "upward_rent_savings_score"("userId");

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'upward_rent_vault_userId_fkey'
    ) THEN
        ALTER TABLE "upward_rent_vault" ADD CONSTRAINT "upward_rent_vault_userId_fkey" FOREIGN KEY ("userId") REFERENCES "upward_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'upward_rent_vault_transaction_vaultId_fkey'
    ) THEN
        ALTER TABLE "upward_rent_vault_transaction" ADD CONSTRAINT "upward_rent_vault_transaction_vaultId_fkey" FOREIGN KEY ("vaultId") REFERENCES "upward_rent_vault"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'upward_rent_vault_transaction_userId_fkey'
    ) THEN
        ALTER TABLE "upward_rent_vault_transaction" ADD CONSTRAINT "upward_rent_vault_transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "upward_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'upward_rent_advance_vaultId_fkey'
    ) THEN
        ALTER TABLE "upward_rent_advance" ADD CONSTRAINT "upward_rent_advance_vaultId_fkey" FOREIGN KEY ("vaultId") REFERENCES "upward_rent_vault"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'upward_rent_advance_userId_fkey'
    ) THEN
        ALTER TABLE "upward_rent_advance" ADD CONSTRAINT "upward_rent_advance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "upward_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'upward_rent_settlement_vaultId_fkey'
    ) THEN
        ALTER TABLE "upward_rent_settlement" ADD CONSTRAINT "upward_rent_settlement_vaultId_fkey" FOREIGN KEY ("vaultId") REFERENCES "upward_rent_vault"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'upward_rent_settlement_userId_fkey'
    ) THEN
        ALTER TABLE "upward_rent_settlement" ADD CONSTRAINT "upward_rent_settlement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "upward_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'upward_rent_savings_score_vaultId_fkey'
    ) THEN
        ALTER TABLE "upward_rent_savings_score" ADD CONSTRAINT "upward_rent_savings_score_vaultId_fkey" FOREIGN KEY ("vaultId") REFERENCES "upward_rent_vault"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'upward_rent_savings_score_userId_fkey'
    ) THEN
        ALTER TABLE "upward_rent_savings_score" ADD CONSTRAINT "upward_rent_savings_score_userId_fkey" FOREIGN KEY ("userId") REFERENCES "upward_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
