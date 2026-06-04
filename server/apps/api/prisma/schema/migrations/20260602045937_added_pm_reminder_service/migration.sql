-- CreateTable
CREATE TABLE "upward_pm_notification" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "pmId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'SYSTEM',
    "url" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isPopup" BOOLEAN NOT NULL DEFAULT false,
    "popupSeen" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_pm_notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "upward_pm_notification_uuid_key" ON "upward_pm_notification"("uuid");

-- CreateIndex
CREATE INDEX "upward_pm_notification_pmId_idx" ON "upward_pm_notification"("pmId");

-- CreateIndex
CREATE INDEX "upward_pm_notification_isRead_idx" ON "upward_pm_notification"("isRead");

-- CreateIndex
CREATE INDEX "upward_pm_notification_createdAt_idx" ON "upward_pm_notification"("createdAt");

-- AddForeignKey
ALTER TABLE "upward_pm_notification" ADD CONSTRAINT "upward_pm_notification_pmId_fkey" FOREIGN KEY ("pmId") REFERENCES "upward_property_manager"("id") ON DELETE CASCADE ON UPDATE CASCADE;
