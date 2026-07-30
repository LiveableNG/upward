-- CreateTable
CREATE TABLE "upward_pm_dedicated_virtual_account" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "pmId" INTEGER NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "bankCode" TEXT NOT NULL,
    "paystackCustomerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_pm_dedicated_virtual_account_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "upward_pm_dedicated_virtual_account_uuid_key" ON "upward_pm_dedicated_virtual_account"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "upward_pm_dedicated_virtual_account_pmId_key" ON "upward_pm_dedicated_virtual_account"("pmId");

-- CreateIndex
CREATE UNIQUE INDEX "upward_pm_dedicated_virtual_account_accountNumber_key" ON "upward_pm_dedicated_virtual_account"("accountNumber");

-- AddForeignKey
ALTER TABLE "upward_pm_dedicated_virtual_account" ADD CONSTRAINT "upward_pm_dedicated_virtual_account_pmId_fkey" FOREIGN KEY ("pmId") REFERENCES "upward_property_manager"("id") ON DELETE CASCADE ON UPDATE CASCADE;
