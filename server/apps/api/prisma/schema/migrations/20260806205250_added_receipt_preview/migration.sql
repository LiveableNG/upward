-- CreateTable
CREATE TABLE "upward_pm_receipt_setting" (
    "id" SERIAL NOT NULL,
    "pmId" INTEGER NOT NULL,
    "logoUrl" TEXT,
    "useEmailLogo" BOOLEAN NOT NULL DEFAULT true,
    "themeColor" TEXT NOT NULL DEFAULT '#d97757',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_pm_receipt_setting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "upward_pm_receipt_setting_pmId_key" ON "upward_pm_receipt_setting"("pmId");

-- CreateIndex
CREATE INDEX "upward_pm_receipt_setting_pmId_idx" ON "upward_pm_receipt_setting"("pmId");

-- AddForeignKey
ALTER TABLE "upward_pm_receipt_setting" ADD CONSTRAINT "upward_pm_receipt_setting_pmId_fkey" FOREIGN KEY ("pmId") REFERENCES "upward_property_manager"("id") ON DELETE CASCADE ON UPDATE CASCADE;
