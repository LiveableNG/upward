-- CreateTable
CREATE TABLE "upward_app_activity_log" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "app" TEXT NOT NULL,
    "userId" INTEGER,
    "pmId" INTEGER,
    "userRole" TEXT NOT NULL,
    "userEmail" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upward_app_activity_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "upward_app_activity_log_uuid_key" ON "upward_app_activity_log"("uuid");

-- CreateIndex
CREATE INDEX "upward_app_activity_log_app_idx" ON "upward_app_activity_log"("app");

-- CreateIndex
CREATE INDEX "upward_app_activity_log_userId_idx" ON "upward_app_activity_log"("userId");

-- CreateIndex
CREATE INDEX "upward_app_activity_log_pmId_idx" ON "upward_app_activity_log"("pmId");

-- CreateIndex
CREATE INDEX "upward_app_activity_log_userEmail_idx" ON "upward_app_activity_log"("userEmail");

-- CreateIndex
CREATE INDEX "upward_app_activity_log_action_idx" ON "upward_app_activity_log"("action");

-- CreateIndex
CREATE INDEX "upward_app_activity_log_createdAt_idx" ON "upward_app_activity_log"("createdAt");
