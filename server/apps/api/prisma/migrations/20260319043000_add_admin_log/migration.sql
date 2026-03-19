-- CreateTable
CREATE TABLE "upward_admin_log" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upward_admin_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "upward_admin_log_adminId_idx" ON "upward_admin_log"("adminId");

-- CreateIndex
CREATE INDEX "upward_admin_log_action_idx" ON "upward_admin_log"("action");

-- CreateIndex
CREATE INDEX "upward_admin_log_createdAt_idx" ON "upward_admin_log"("createdAt");

-- AddForeignKey
ALTER TABLE "upward_admin_log" ADD CONSTRAINT "upward_admin_log_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "upward_admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
