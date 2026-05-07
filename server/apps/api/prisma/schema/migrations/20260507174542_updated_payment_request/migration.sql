-- AlterTable
ALTER TABLE "upward_payment_request" ADD COLUMN     "rentEndDate" TIMESTAMP(3),
ADD COLUMN     "rentStartDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "upward_pm_payment_request" ADD COLUMN     "rentEndDate" TIMESTAMP(3),
ADD COLUMN     "rentStartDate" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "upward_pm_document_template" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "pmId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'CUSTOM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_pm_document_template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_pm_sent_document" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "pmId" INTEGER NOT NULL,
    "tenantId" INTEGER,
    "unitId" INTEGER,
    "subject" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "documentType" TEXT NOT NULL DEFAULT 'PDF',
    "recipientName" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_pm_sent_document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "upward_pm_document_template_uuid_key" ON "upward_pm_document_template"("uuid");

-- CreateIndex
CREATE INDEX "upward_pm_document_template_pmId_idx" ON "upward_pm_document_template"("pmId");

-- CreateIndex
CREATE UNIQUE INDEX "upward_pm_sent_document_uuid_key" ON "upward_pm_sent_document"("uuid");

-- CreateIndex
CREATE INDEX "upward_pm_sent_document_pmId_idx" ON "upward_pm_sent_document"("pmId");

-- CreateIndex
CREATE INDEX "upward_pm_sent_document_tenantId_idx" ON "upward_pm_sent_document"("tenantId");

-- CreateIndex
CREATE INDEX "upward_pm_sent_document_unitId_idx" ON "upward_pm_sent_document"("unitId");

-- CreateIndex
CREATE INDEX "upward_pm_sent_document_recipientEmail_idx" ON "upward_pm_sent_document"("recipientEmail");

-- AddForeignKey
ALTER TABLE "upward_pm_document_template" ADD CONSTRAINT "upward_pm_document_template_pmId_fkey" FOREIGN KEY ("pmId") REFERENCES "upward_property_manager"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_pm_sent_document" ADD CONSTRAINT "upward_pm_sent_document_pmId_fkey" FOREIGN KEY ("pmId") REFERENCES "upward_property_manager"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_pm_sent_document" ADD CONSTRAINT "upward_pm_sent_document_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "upward_pm_tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_pm_sent_document" ADD CONSTRAINT "upward_pm_sent_document_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "upward_pm_unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
