-- CreateTable
CREATE TABLE "upward_pm_signature" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "pmId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fileKey" TEXT,
    "content" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_pm_signature_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "upward_pm_signature_uuid_key" ON "upward_pm_signature"("uuid");

-- CreateIndex
CREATE INDEX "upward_pm_signature_pmId_idx" ON "upward_pm_signature"("pmId");

-- AddForeignKey
ALTER TABLE "upward_pm_signature" ADD CONSTRAINT "upward_pm_signature_pmId_fkey" FOREIGN KEY ("pmId") REFERENCES "upward_property_manager"("id") ON DELETE CASCADE ON UPDATE CASCADE;
