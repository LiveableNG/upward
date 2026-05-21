-- AlterTable
ALTER TABLE "upward_email_log" ADD COLUMN     "registeredUserId" INTEGER,
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "upward_user" ADD COLUMN     "campaignWeekSent" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "unsubscribed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "unsubscribedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "upward_pm_email_setting" (
    "id" SERIAL NOT NULL,
    "pmId" INTEGER NOT NULL,
    "senderName" TEXT NOT NULL,
    "senderEmail" TEXT NOT NULL,
    "logoUrl" TEXT,
    "footerAddress" TEXT,
    "cc" TEXT,
    "bcc" TEXT,
    "closingStatement" TEXT,
    "domain" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_pm_email_setting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "upward_pm_email_setting_pmId_key" ON "upward_pm_email_setting"("pmId");

-- CreateIndex
CREATE INDEX "upward_pm_email_setting_pmId_idx" ON "upward_pm_email_setting"("pmId");

-- CreateIndex
CREATE INDEX "upward_email_log_registeredUserId_idx" ON "upward_email_log"("registeredUserId");

-- AddForeignKey
ALTER TABLE "upward_pm_email_setting" ADD CONSTRAINT "upward_pm_email_setting_pmId_fkey" FOREIGN KEY ("pmId") REFERENCES "upward_property_manager"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_email_log" ADD CONSTRAINT "upward_email_log_registeredUserId_fkey" FOREIGN KEY ("registeredUserId") REFERENCES "upward_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
