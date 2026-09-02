 -- CreateTable
CREATE TABLE "upward_pm_approval_request" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "ownerPmId" INTEGER NOT NULL,
    "requesterPmId" INTEGER NOT NULL,
    "propertyUuid" TEXT,
    "propertyName" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "payload" JSONB,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_pm_approval_request_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "upward_pm_approval_request_uuid_key" ON "upward_pm_approval_request"("uuid");

-- CreateIndex
CREATE INDEX "upward_pm_approval_request_ownerPmId_idx" ON "upward_pm_approval_request"("ownerPmId");

-- CreateIndex
CREATE INDEX "upward_pm_approval_request_requesterPmId_idx" ON "upward_pm_approval_request"("requesterPmId");

-- CreateIndex
CREATE INDEX "upward_pm_approval_request_status_idx" ON "upward_pm_approval_request"("status");

-- AddForeignKey
ALTER TABLE "upward_pm_approval_request" ADD CONSTRAINT "upward_pm_approval_request_ownerPmId_fkey" FOREIGN KEY ("ownerPmId") REFERENCES "upward_property_manager"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_pm_approval_request" ADD CONSTRAINT "upward_pm_approval_request_requesterPmId_fkey" FOREIGN KEY ("requesterPmId") REFERENCES "upward_property_manager"("id") ON DELETE CASCADE ON UPDATE CASCADE;
