-- CreateTable
CREATE TABLE "upward_subscription_log" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "pmId" INTEGER NOT NULL,
    "adminId" TEXT,
    "previousTier" "UpwardSubscriptionTier" NOT NULL,
    "newTier" "UpwardSubscriptionTier" NOT NULL,
    "previousStatus" TEXT NOT NULL,
    "newStatus" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upward_subscription_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "upward_subscription_log_uuid_key" ON "upward_subscription_log"("uuid");

-- AddForeignKey
ALTER TABLE "upward_subscription_log" ADD CONSTRAINT "upward_subscription_log_pmId_fkey" FOREIGN KEY ("pmId") REFERENCES "upward_property_manager"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_subscription_log" ADD CONSTRAINT "upward_subscription_log_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "upward_admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
