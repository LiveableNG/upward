-- CreateTable
CREATE TABLE "upward_benefits_subscription" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "userPropertyId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "amountPaid" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "source" TEXT NOT NULL,
    "sourceTransactionId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_benefits_subscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "upward_benefits_subscription_uuid_key" ON "upward_benefits_subscription"("uuid");

-- CreateIndex
CREATE INDEX "upward_benefits_subscription_userId_idx" ON "upward_benefits_subscription"("userId");

-- CreateIndex
CREATE INDEX "upward_benefits_subscription_userPropertyId_idx" ON "upward_benefits_subscription"("userPropertyId");

-- CreateIndex
CREATE INDEX "upward_benefits_subscription_status_idx" ON "upward_benefits_subscription"("status");

-- CreateIndex
CREATE INDEX "upward_benefits_subscription_endsAt_idx" ON "upward_benefits_subscription"("endsAt");

-- CreateIndex
CREATE INDEX "upward_benefits_subscription_userId_userPropertyId_status_idx" ON "upward_benefits_subscription"("userId", "userPropertyId", "status");

-- AddForeignKey
ALTER TABLE "upward_benefits_subscription" ADD CONSTRAINT "upward_benefits_subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "upward_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_benefits_subscription" ADD CONSTRAINT "upward_benefits_subscription_userPropertyId_fkey" FOREIGN KEY ("userPropertyId") REFERENCES "upward_user_property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_benefits_subscription" ADD CONSTRAINT "upward_benefits_subscription_sourceTransactionId_fkey" FOREIGN KEY ("sourceTransactionId") REFERENCES "upward_transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
