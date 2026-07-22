-- CreateTable
CREATE TABLE "upward_pm_bulk_import_job" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "pmId" INTEGER NOT NULL,
    "targetPropertyUuid" TEXT,
    "mode" TEXT NOT NULL DEFAULT 'full',
    "originalFileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_ASSIGNMENT',
    "assignedAdminId" TEXT,
    "assignedAdminName" TEXT,
    "assignedAdminEmail" TEXT,
    "stagedRowsJson" TEXT,
    "unitsCreated" INTEGER NOT NULL DEFAULT 0,
    "propertiesCreated" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_pm_bulk_import_job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_pm_bulk_import_log" (
    "id" SERIAL NOT NULL,
    "jobId" INTEGER NOT NULL,
    "adminId" TEXT,
    "adminEmail" TEXT,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upward_pm_bulk_import_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "upward_pm_bulk_import_job_uuid_key" ON "upward_pm_bulk_import_job"("uuid");

-- CreateIndex
CREATE INDEX "upward_pm_bulk_import_job_pmId_idx" ON "upward_pm_bulk_import_job"("pmId");

-- CreateIndex
CREATE INDEX "upward_pm_bulk_import_job_assignedAdminId_idx" ON "upward_pm_bulk_import_job"("assignedAdminId");

-- CreateIndex
CREATE INDEX "upward_pm_bulk_import_job_status_idx" ON "upward_pm_bulk_import_job"("status");

-- CreateIndex
CREATE INDEX "upward_pm_bulk_import_log_jobId_idx" ON "upward_pm_bulk_import_log"("jobId");

-- AddForeignKey
ALTER TABLE "upward_pm_bulk_import_job" ADD CONSTRAINT "upward_pm_bulk_import_job_pmId_fkey" FOREIGN KEY ("pmId") REFERENCES "upward_property_manager"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_pm_bulk_import_job" ADD CONSTRAINT "upward_pm_bulk_import_job_assignedAdminId_fkey" FOREIGN KEY ("assignedAdminId") REFERENCES "upward_admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_pm_bulk_import_log" ADD CONSTRAINT "upward_pm_bulk_import_log_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "upward_pm_bulk_import_job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
