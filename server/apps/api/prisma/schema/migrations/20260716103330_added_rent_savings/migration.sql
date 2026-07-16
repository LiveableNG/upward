-- AlterTable
ALTER TABLE "upward_user" ADD COLUMN     "savingsWalletEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "upward_wallet" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_wallet_transaction" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "walletId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "amount" DOUBLE PRECISION NOT NULL,
    "reference" TEXT,
    "narration" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_wallet_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_savings_goal" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "targetAmount" DOUBLE PRECISION NOT NULL,
    "currentAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "reminderEnabled" BOOLEAN NOT NULL DEFAULT true,
    "reminderFrequency" TEXT,
    "reminderDay" INTEGER,
    "autoSaveEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_savings_goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_savings_config" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "dailyInterestRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_savings_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "upward_wallet_uuid_key" ON "upward_wallet"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "upward_wallet_userId_key" ON "upward_wallet"("userId");

-- CreateIndex
CREATE INDEX "upward_wallet_userId_idx" ON "upward_wallet"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "upward_wallet_transaction_uuid_key" ON "upward_wallet_transaction"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "upward_wallet_transaction_reference_key" ON "upward_wallet_transaction"("reference");

-- CreateIndex
CREATE INDEX "upward_wallet_transaction_walletId_idx" ON "upward_wallet_transaction"("walletId");

-- CreateIndex
CREATE INDEX "upward_wallet_transaction_userId_idx" ON "upward_wallet_transaction"("userId");

-- CreateIndex
CREATE INDEX "upward_wallet_transaction_type_idx" ON "upward_wallet_transaction"("type");

-- CreateIndex
CREATE UNIQUE INDEX "upward_savings_goal_uuid_key" ON "upward_savings_goal"("uuid");

-- CreateIndex
CREATE INDEX "upward_savings_goal_userId_idx" ON "upward_savings_goal"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "upward_savings_goal_userId_category_key" ON "upward_savings_goal"("userId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "upward_savings_config_key_key" ON "upward_savings_config"("key");

-- AddForeignKey
ALTER TABLE "upward_wallet" ADD CONSTRAINT "upward_wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "upward_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_wallet_transaction" ADD CONSTRAINT "upward_wallet_transaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "upward_wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_wallet_transaction" ADD CONSTRAINT "upward_wallet_transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "upward_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_savings_goal" ADD CONSTRAINT "upward_savings_goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "upward_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
