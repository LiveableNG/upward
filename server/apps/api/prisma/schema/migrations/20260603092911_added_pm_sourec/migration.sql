-- AlterTable
ALTER TABLE "upward_pm_sent_document" ADD COLUMN     "isVaultDocument" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paymentRequestId" INTEGER;

-- AlterTable
ALTER TABLE "upward_user_contract" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'TENANT';

-- CreateIndex
CREATE INDEX "upward_pm_sent_document_isVaultDocument_idx" ON "upward_pm_sent_document"("isVaultDocument");
