-- AlterTable
ALTER TABLE "upward_waitlist" ADD COLUMN     "campaignWeekSent" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "upward_email_campaign" (
    "id" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "htmlContent" TEXT NOT NULL,
    "textContent" TEXT,
    "label" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_email_campaign_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "upward_email_campaign_weekNumber_key" ON "upward_email_campaign"("weekNumber");

-- CreateIndex
CREATE INDEX "upward_email_campaign_weekNumber_idx" ON "upward_email_campaign"("weekNumber");

-- CreateIndex
CREATE INDEX "upward_email_campaign_isActive_idx" ON "upward_email_campaign"("isActive");
