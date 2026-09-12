-- AlterTable upward_pm_notification
ALTER TABLE "upward_pm_notification" ADD COLUMN "employeeId" INTEGER;

-- CreateIndex
CREATE INDEX "upward_pm_notification_employeeId_idx" ON "upward_pm_notification"("employeeId");

-- AddForeignKey
ALTER TABLE "upward_pm_notification" ADD CONSTRAINT "upward_pm_notification_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "upward_pm_employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
