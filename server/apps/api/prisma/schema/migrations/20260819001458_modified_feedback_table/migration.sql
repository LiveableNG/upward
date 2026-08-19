-- AlterTable
ALTER TABLE "upward_company" ADD COLUMN     "logoUrl" TEXT;

-- AlterTable
ALTER TABLE "upward_feedback" ADD COLUMN     "pmId" INTEGER;

-- CreateIndex
CREATE INDEX "upward_feedback_pmId_idx" ON "upward_feedback"("pmId");

-- AddForeignKey
ALTER TABLE "upward_feedback" ADD CONSTRAINT "upward_feedback_pmId_fkey" FOREIGN KEY ("pmId") REFERENCES "upward_property_manager"("id") ON DELETE SET NULL ON UPDATE CASCADE;
