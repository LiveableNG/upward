-- CreateTable
CREATE TABLE "upward_error_log" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "context" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'ERROR',
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_error_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "upward_error_log_createdAt_idx" ON "upward_error_log"("createdAt");

-- CreateIndex
CREATE INDEX "upward_error_log_severity_idx" ON "upward_error_log"("severity");

-- CreateIndex
CREATE INDEX "upward_error_log_resolved_idx" ON "upward_error_log"("resolved");
