-- AlterTable
ALTER TABLE "upward_property_manager" ADD COLUMN     "disabledAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "upward_user" ADD COLUMN     "disabledAt" TIMESTAMP(3),
ADD COLUMN     "isBlocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isManuallyBlocked" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "upward_deletion_audit_log" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "adminEmail" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "targetEmail" TEXT NOT NULL,
    "targetRole" TEXT NOT NULL,
    "disabledAt" TIMESTAMP(3) NOT NULL,
    "daysDisabled" INTEGER NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,

    CONSTRAINT "upward_deletion_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "upward_deletion_audit_log_adminId_idx" ON "upward_deletion_audit_log"("adminId");

-- CreateIndex
CREATE INDEX "upward_deletion_audit_log_targetUserId_idx" ON "upward_deletion_audit_log"("targetUserId");

-- CreateIndex
CREATE INDEX "upward_deletion_audit_log_deletedAt_idx" ON "upward_deletion_audit_log"("deletedAt");
