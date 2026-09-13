-- AlterTable upward_pm_payment_request
ALTER TABLE "upward_pm_payment_request" ADD COLUMN "employeeId" INTEGER;

-- AlterTable upward_pm_sent_document
ALTER TABLE "upward_pm_sent_document" ADD COLUMN "employeeId" INTEGER;

-- CreateIndex
CREATE INDEX "upward_pm_payment_request_employeeId_idx" ON "upward_pm_payment_request"("employeeId");
CREATE INDEX "upward_pm_sent_document_employeeId_idx" ON "upward_pm_sent_document"("employeeId");

-- AddForeignKey
ALTER TABLE "upward_pm_payment_request" ADD CONSTRAINT "upward_pm_payment_request_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "upward_pm_employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_pm_sent_document" ADD CONSTRAINT "upward_pm_sent_document_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "upward_pm_employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
